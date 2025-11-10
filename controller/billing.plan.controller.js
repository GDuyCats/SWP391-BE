// controller/billing.plan.controller.js
import Stripe from "stripe";
import { VipPlanModel, VipPurchaseModel, PostModel, UserModel } from "../postgres/postgres.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

export const listActivePlans = async (_req, res) => {
  const plans = await VipPlanModel.findAll({
    where: { active: true },
    order: [["amount", "ASC"]],
  });
  res.json({ ok: true, plans });
};

/**
 * [POST] /api/billing/checkout-for-post
 * Body: { planId, postId }
 * - Tạo Checkout Session để thanh toán gói VIP cho MỘT bài post cụ thể
 */
export const checkoutFromPlan = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { planId, postId } = req.body || {};

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!planId || !postId)
      return res.status(400).json({ message: "Thiếu planId hoặc postId" });

    // Load song song
    const [user, plan, post] = await Promise.all([
      UserModel.findByPk(userId),
      VipPlanModel.findByPk(planId),
      PostModel.findByPk(postId),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!plan || !plan.active)
      return res.status(404).json({ message: "Plan not found/inactive" });
    if (!post || post.userId !== userId)
      return res
        .status(404)
        .json({ message: "Không tìm thấy bài đăng hoặc không thuộc sở hữu của bạn" });

    // Không cho thanh toán nếu bài đã hiển thị hoặc VIP còn hạn
    const stillVip =
      post.isVip && post.vipExpiresAt && new Date(post.vipExpiresAt) > new Date();
    if (post.isActive || stillVip) {
      return res
        .status(400)
        .json({ message: "Bài đã hiển thị hoặc đang còn VIP. Không thể thanh toán." });
    }

    // Nếu đã có giao dịch PENDING cho bài này thì không tạo thêm
    const pending = await VipPurchaseModel.findOne({
      where: { userId, postId, status: "PENDING" },
    });
    if (pending) {
      return res.status(409).json({
        message: "Bạn đã có phiên thanh toán đang chờ cho bài này",
        orderCode: pending.orderCode,
      });
    }

    const orderCode = `VIP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Ghi record giao dịch
    await VipPurchaseModel.create({
      userId,
      postId,
      vipPlanId: plan.id, // nếu schema có cột này, rất tiện cho truy vết
      orderCode,
      amount: plan.amount,
      status: "PENDING",
      provider: "stripe",
      rawPayload: { planId: plan.id, postId },
    });

    const mode = plan.type === "subscription" ? "subscription" : "payment";

    // one_time mà chưa cấu hình stripePriceId → dùng inline price để dev/test
    const useInlinePrice = !plan.stripePriceId && plan.type === "one_time";

    if (mode === "subscription" && !plan.stripePriceId) {
      return res.status(400).json({
        message: "Gói subscription thiếu stripePriceId. Hãy tạo Price trên Stripe cho plan này.",
      });
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode,
        line_items: useInlinePrice
          ? [
              {
                price_data: {
                  currency: plan.currency || "vnd",
                  product_data: { name: plan.name },
                  unit_amount: plan.amount,
                },
                quantity: 1,
              },
            ]
          : [{ price: plan.stripePriceId, quantity: 1 }],
        metadata: {
          orderCode,
          userId: String(userId),
          planId: String(plan.id),
          postId: String(postId),
          type: plan.type, // 'one_time' | 'subscription'
          durationDays: String(plan.durationDays ?? ""),
        },
        success_url: `${process.env.CLIENT_URL}`,
        cancel_url: `${process.env.CLIENT_URL}`,
      },
      // idempotent để tránh tạo session trùng nếu client retry
      { idempotencyKey: orderCode }
    );

    if (!session?.url)
      return res.status(500).json({ message: "Stripe session has no URL" });

    return res.status(201).json({ ok: true, url: session.url, orderCode });
  } catch (e) {
    console.error("[checkoutFromPlan] error:", e);

    // Một số lỗi Stripe trả 4xx thay vì 500 cho dễ debug
    if (e?.type === "StripeInvalidRequestError") {
      return res.status(400).json({ message: e.message });
    }

    return res.status(500).json({ message: "Checkout failed", error: e.message });
  }
};
