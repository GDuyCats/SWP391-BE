// controller/stripe.controller.js
import Stripe from "stripe";
import { addDays } from "date-fns";
import {
  VipPurchaseModel,
  VipPlanModel,
  PostModel,
  UserModel,
} from "../postgres/postgres.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const DEFAULT_PRICE_VND = 99000;
const DEFAULT_DURATION_DAYS = 30;
const ALLOWED_TIERS = ["diamond", "gold", "silver"];
const genCode = () => "VIP" + Date.now() + Math.floor(Math.random() * 1000);

/**
 * [POST] /api/stripe/checkout
 * Body: { planId, postId }
 */
export const createVipCheckout = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { planId, postId } = req.body || {};
    if (!planId || !postId)
      return res.status(400).json({ message: "Thiếu planId hoặc postId" });

    const [user, plan, post] = await Promise.all([
      UserModel.findByPk(userId),
      VipPlanModel.findByPk(planId),
      PostModel.findByPk(postId),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!plan || !plan.active) return res.status(404).json({ message: "Plan not found or inactive" });
    if (!post || post.userId !== userId)
      return res.status(404).json({ message: "Không tìm thấy bài đăng hoặc không thuộc sở hữu của bạn" });

    // ❌ Cấm thanh toán nếu bài đã hiển thị hoặc đã VIP còn hạn
    if (post.isActive || (post.isVip && post.vipExpiresAt && new Date(post.vipExpiresAt) > new Date())) {
      return res.status(400).json({ message: "Bài đã hiển thị hoặc đang còn VIP. Không thể thanh toán." });
    }

    // Nếu đang có giao dịch PENDING cho bài này → tránh tạo thêm session
    const existingPending = await VipPurchaseModel.findOne({
      where: { userId, postId, status: "PENDING" },
    });
    if (existingPending) {
      return res.status(409).json({
        message: "Bạn đã có phiên thanh toán đang chờ cho bài này",
        orderCode: existingPending.orderCode,
      });
    }

    const orderCode = genCode();
    await VipPurchaseModel.create({
      userId,
      postId,
      orderCode,
      amount: plan.amount,
      status: "PENDING",
      provider: "stripe",
      rawPayload: { planId: plan.id, postId },
      vipPlanId: plan.id, // nếu schema VipPurchase có cột này, lưu luôn cho tiện
    });

    const mode = plan.type === "subscription" ? "subscription" : "payment";

    // Hỗ trợ dev: nếu chưa cấu hình priceId cho one_time → dùng inline price
    const useInlinePrice = !plan.stripePriceId && plan.type === "one_time";

    const params = {
      mode,
      line_items: useInlinePrice
        ? [{
            price_data: {
              currency: plan.currency || "vnd",
              product_data: { name: plan.name },
              unit_amount: plan.amount || DEFAULT_PRICE_VND,
            },
            quantity: 1,
          }]
        : [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: {
        orderCode,
        userId: String(userId),
        planId: String(plan.id),
        postId: String(postId),
        type: plan.type,
        durationDays: String(plan.durationDays ?? ""),
      },
      success_url: `${process.env.CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/billing/cancel`,
    };

    // Với subscription, bắt buộc phải có priceId hợp lệ
    if (mode === "subscription" && !plan.stripePriceId) {
      return res.status(400).json({ message: "Gói subscription thiếu stripePriceId" });
    }

    // Thêm idempotencyKey để tránh tạo nhiều session trùng nếu client retry
    const session = await stripe.checkout.sessions.create(
      params,
      { idempotencyKey: orderCode }
    );

    if (!session?.url) return res.status(500).json({ message: "Stripe session has no URL" });

    return res.status(201).json({ ok: true, url: session.url, orderCode });
  } catch (err) {
    console.error("[createVipCheckout] error:", err);

    // Bắt một số lỗi Stripe thường gặp để trả 4xx thay vì 500
    if (err?.type === "StripeInvalidRequestError") {
      return res.status(400).json({ ok: false, message: err.message });
    }

    return res.status(500).json({ ok: false, message: err.message || "Create checkout failed" });
  }
};

/**
 * [POST] /api/stripe/webhook
 * - Route này phải nhận raw body!
 */
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[stripeWebhook] verify failed:", err?.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const orderCode = s?.metadata?.orderCode;
      const userId = Number(s?.metadata?.userId);
      const planId = Number(s?.metadata?.planId);
      const postId = Number(s?.metadata?.postId);
      const type = s?.metadata?.type || "one_time";
      const metaDuration = s?.metadata?.durationDays ? Number(s.metadata.durationDays) : null;

      if (!orderCode || !userId || !postId) {
        console.warn("[stripeWebhook] missing metadata:", s?.metadata);
        return res.json({ received: true });
      }

      const tx = await VipPurchaseModel.findOne({ where: { orderCode } });
      if (!tx) {
        console.warn("[stripeWebhook] VipPurchase not found:", orderCode);
        return res.json({ received: true });
      }
      if (tx.status === "PAID") {
        // Idempotent
        return res.json({ received: true });
      }

      const [post, plan, user] = await Promise.all([
        PostModel.findByPk(postId),
        VipPlanModel.findByPk(planId || tx.vipPlanId || 0),
        UserModel.findByPk(userId),
      ]);

      if (!post || !user || post.userId !== user.id) {
        console.warn("[stripeWebhook] invalid post/user ownership");
        await tx.update({ status: "FAILED", rawPayload: s });
        return res.json({ received: true });
      }

      // Đánh dấu giao dịch đã thanh toán
      await tx.update({ status: "PAID", rawPayload: s });

      // Tính hạn VIP:
      let vipExpiresAt = null;
      if (type === "subscription" && s.mode === "subscription" && s.subscription) {
        // Lấy kỳ hạn thật từ subscription (khuyến nghị)
        try {
          const sub = await stripe.subscriptions.retrieve(s.subscription);
          vipExpiresAt = new Date(sub.current_period_end * 1000);
        } catch (e) {
          console.warn("[webhook] retrieve subscription failed:", e?.message);
          vipExpiresAt = addDays(new Date(), metaDuration || DEFAULT_DURATION_DAYS);
        }
      } else {
        const days = (plan && plan.durationDays) || metaDuration || DEFAULT_DURATION_DAYS;
        vipExpiresAt = addDays(new Date(), days);
      }

      // Xác định tier/priority an toàn
      const vipTier = plan?.slug && ALLOWED_TIERS.includes(plan.slug) ? plan.slug : null;
      const vipPriority = plan?.priority ?? 0;

      // ❗ Nếu bạn muốn hiển thị ngay sau khi trả tiền:
      //  - set isActive=true
      //  - nếu public list đang lọc verifyStatus='verify', thì set verifyStatus='verify' luôn
      await post.update({
        isVip: true,
        isActive: true,
        verifyStatus: "verify", // nếu bạn vẫn muốn duyệt tay, hãy đổi thành "nonverify" và để staff bật isActive sau
        vipPlanId: plan ? plan.id : null,
        vipTier,
        vipPriority,
        vipExpiresAt,
        paidAt: new Date(),
        publishedAt: new Date(),
      });

      console.log(`[stripeWebhook] ✅ Post ${postId} VIP active until ${vipExpiresAt.toISOString()}`);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[stripeWebhook] handler error:", err);
    // vẫn trả 200 cho Stripe để khỏi retry quá dày; bạn theo dõi log để xử lý lại nếu cần
    return res.json({ received: true });
  }
};
