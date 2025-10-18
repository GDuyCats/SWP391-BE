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

const genCode = () => "VIP" + Date.now() + Math.floor(Math.random() * 1000);

/**
 * [POST] /api/stripe/checkout
 * FE gửi: { planId, postId }
 * - planId: id gói VIP (bắt buộc)
 * - postId: id bài đăng đang chờ thanh toán (bắt buộc)
 */
export const createVipCheckout = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { planId, postId } = req.body || {};
    if (!planId || !postId)
      return res.status(400).json({ message: "Thiếu planId hoặc postId" });

    const user = await UserModel.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const plan = await VipPlanModel.findByPk(planId);
    if (!plan || !plan.active)
      return res.status(404).json({ message: "Plan not found or inactive" });

    const post = await PostModel.findByPk(postId);
    if (!post || post.userId !== userId)
      return res.status(404).json({ message: "Không tìm thấy bài đăng hoặc không thuộc sở hữu của bạn" });

    const orderCode = genCode();

    // Ghi log giao dịch trước
    await VipPurchaseModel.create({
      userId,
      postId,
      orderCode,
      amount: plan.amount,
      status: "PENDING",
      provider: "stripe",
      rawPayload: { planId: plan.id },
    });

    // Tạo Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: plan.type === "subscription" ? "subscription" : "payment",
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: {
        orderCode,
        userId: String(userId),
        planId: String(plan.id),
        postId: String(postId),
        type: plan.type,
        durationDays: String(plan.durationDays),
      },
      success_url: `${process.env.CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/billing/cancel`,
    });

    if (!session?.url)
      return res.status(500).json({ message: "Stripe session has no URL" });

    return res.json({ ok: true, url: session.url, orderCode });
  } catch (err) {
    console.error("[createVipCheckout] error:", err);
    return res.status(500).json({ ok: false, message: err.message || "Create checkout failed" });
  }
};

/**
 * [POST] /api/stripe/webhook
 * - Stripe webhook xác nhận thanh toán thành công
 * - Cập nhật VipPurchaseModel và PostModel
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
        // Idempotent retry
        return res.json({ received: true });
      }

      const post = await PostModel.findByPk(postId);
      const plan = planId ? await VipPlanModel.findByPk(planId) : null;

      if (!post) {
        console.warn("[stripeWebhook] post not found:", postId);
        return res.json({ received: true });
      }

      // Cập nhật giao dịch
      await tx.update({ status: "PAID", rawPayload: s });

      // Tính hạn VIP cho bài
      const days = (plan && plan.durationDays) || metaDuration || DEFAULT_DURATION_DAYS;
      const vipExpiresAt = addDays(new Date(), days);

      await post.update({
        isVip: true,
        isActive: true,
        verifyStatus: "nonverify",
        vipPlanId: plan ? plan.id : null,
        vipTier: plan ? plan.slug : "custom",
        vipPriority: plan ? plan.priority : 0,
        vipExpiresAt,
      });

      console.log(`[stripeWebhook] ✅ Post ${postId} VIP activated until ${vipExpiresAt.toISOString()}`);
    }

    // Stripe yêu cầu phản hồi nhanh
    return res.json({ received: true });
  } catch (err) {
    console.error("[stripeWebhook] handler error:", err);
    return res.json({ received: true });
  }
};
