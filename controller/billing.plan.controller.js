// controller/billing.plan.controller.js
import Stripe from "stripe";
import { VipPlanModel, VipPurchaseModel } from "../postgres/postgres.js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

export const listActivePlans = async (_req, res) => {
  const plans = await VipPlanModel.findAll({ where: { active: true }, order: [["amount","ASC"]] });
  res.json({ ok: true, plans });
};

export const checkoutFromPlan = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { planId } = req.body;
    if (!userId || !planId) return res.status(400).json({ message: "Missing userId/planId" });

    const plan = await VipPlanModel.findByPk(planId);
    if (!plan || !plan.active) return res.status(404).json({ message: "Plan not found/inactive" });

    // tạo record PENDING
    const orderCode = `VIP${Date.now()}${Math.floor(Math.random()*1000)}`;
    await VipPurchaseModel.create({
      userId, orderCode, amount: plan.amount, status: "PENDING", provider: "stripe",
      rawPayload: { planId },
    });

    // mode: subscription | payment
    const mode = plan.type === "subscription" ? "subscription" : "payment";

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      metadata: { orderCode, userId: String(userId), planId: String(plan.id) },
      success_url: `${process.env.CLIENT_URL}`,
    //   /billing/success?session_id={CHECKOUT_SESSION_ID}
      cancel_url: `${process.env.CLIENT_URL}/billing/cancel`,
    });

    return res.json({ ok: true, url: session.url, orderCode });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Checkout failed", error: e.message });
  }
};
