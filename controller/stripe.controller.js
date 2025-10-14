// controller/stripe.controller.js
import Stripe from "stripe";
import { addDays } from "date-fns";
import {
  VipPurchaseModel,
  UserModel,
  VipPlanModel,            // 👈 cần export từ postgres
} from "../postgres/postgres.js";

// Stripe SDK
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// Fallback nếu không truyền planId
const DEFAULT_PRICE_VND = 99000;
const DEFAULT_DURATION_DAYS = 30;

const genCode = () => "VIP" + Date.now() + Math.floor(Math.random() * 1000);

/**
 * Tạo Checkout Session từ 1 gói (plan). FE có thể truyền:
 * { planId?: number }
 * - Nếu có planId: dùng price Stripe của plan đó
 * - Nếu không: dùng inline price 99k / 30 ngày (one-time)
 */
export const createVipCheckout = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await UserModel.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { planId } = req.body || {};
    let plan = null;

    if (planId) {
      plan = await VipPlanModel.findByPk(planId);
      if (!plan || !plan.active) {
        return res.status(404).json({ message: "Plan not found or inactive" });
      }
    }

    const orderCode = genCode();

    // Ghi log giao dịch PENDING trước
    await VipPurchaseModel.create({
      userId,
      orderCode,
      amount: plan ? plan.amount : DEFAULT_PRICE_VND,
      status: "PENDING",
      provider: "stripe",
      rawPayload: plan ? { planId: plan.id } : { fallback: true },
    });

    let session;

    if (plan) {
      // Có plan → dùng price Stripe đã tạo sẵn
      const mode = plan.type === "subscription" ? "subscription" : "payment";

      session = await stripe.checkout.sessions.create({
        mode,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        metadata: {
          orderCode,
          userId: String(userId),
          planId: String(plan.id),
          type: plan.type, // 'one_time' | 'subscription'
          durationDays: plan.durationDays ?? "",
        },
        success_url: `${process.env.CLIENT_URL}`,
        // /billing/success?session_id={CHECKOUT_SESSION_ID}
        cancel_url: `${process.env.CLIENT_URL}/billing/cancel`,
      });
    } else {
      // Không có plan → inline one-time 99k / 30 ngày
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "vnd",
              product_data: { name: `VIP ${DEFAULT_DURATION_DAYS} ngày` },
              unit_amount: DEFAULT_PRICE_VND,
            },
            quantity: 1,
          },
        ],
        metadata: {
          orderCode,
          userId: String(userId),
          type: "one_time",
          durationDays: String(DEFAULT_DURATION_DAYS),
        },
        success_url: `${process.env.CLIENT_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/billing/cancel`,
      });
    }

    if (!session?.url) {
      return res.status(500).json({ ok: false, message: "Stripe session has no URL" });
    }

    return res.json({ ok: true, url: session.url, orderCode });
  } catch (err) {
    console.error("[createVipCheckout] error:", err);
    return res.status(400).json({
      ok: false,
      message: err?.message || "Create checkout failed",
    });
  }
};

/**
 * Webhook Stripe: xác nhận thanh toán
 * - one_time: cộng durationDays
 * - subscription: dùng current_period_end của subscription
 * LƯU Ý: route phải nhận raw body (express.raw) ở app chính!
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
      const planId = s?.metadata?.planId ? Number(s.metadata.planId) : null;
      const type = s?.metadata?.type || "one_time";
      const metaDuration = s?.metadata?.durationDays
        ? Number(s.metadata.durationDays)
        : null;

      if (!orderCode || !userId) {
        console.warn("[stripeWebhook] missing metadata");
        return res.json({ received: true });
      }

      const tx = await VipPurchaseModel.findOne({ where: { orderCode } });
      if (!tx) {
        console.warn("[stripeWebhook] tx not found for", orderCode);
        return res.json({ received: true });
      }

      if (tx.status === "PAID") {
        // idempotent
        return res.json({ received: true });
      }

      // Tìm user & plan (nếu có)
      const user = await UserModel.findByPk(userId);
      const plan = planId ? await VipPlanModel.findByPk(planId) : null;

      // Cập nhật giao dịch
      await tx.update({ status: "PAID", rawPayload: s });

      if (!user) {
        console.warn("[stripeWebhook] user not found:", userId);
        return res.json({ received: true });
      }

      const now = new Date();
      const stillActive = user.isVip && user.vipExpiresAt && new Date(user.vipExpiresAt) > now;
      const start = stillActive ? new Date(user.vipExpiresAt) : now;

      if (type === "subscription" && s.mode === "subscription" && s.subscription) {
        // Lấy kỳ hạn thực từ Stripe subscription
        const sub = await stripe.subscriptions.retrieve(s.subscription);
        const currentEnd = new Date(sub.current_period_end * 1000);
        await user.update({ isVip: true, vipExpiresAt: currentEnd });
      } else {
        // one-time: cộng ngày dựa trên plan.durationDays (nếu có) hoặc metadata / default
        const days =
          (plan && plan.durationDays) ||
          metaDuration ||
          DEFAULT_DURATION_DAYS;

        const expire = addDays(start, days);
        await user.update({ isVip: true, vipExpiresAt: expire });
      }
    }

    // Stripe yêu cầu trả 2xx nhanh
    return res.json({ received: true });
  } catch (err) {
    console.error("[stripeWebhook] handler error:", err);
    // vẫn trả 200 để Stripe không retry quá nhiều, nhưng ghi log để xử lý sau
    return res.json({ received: true });
  }
};
