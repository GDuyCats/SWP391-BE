// controller/admin.plan.controller.js
import Stripe from "stripe";
import { VipPlanModel } from "../postgres/postgres.js";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

export const createVipPlan = async (req, res) => {
  try {
    const { name, description, type, amount, currency="vnd",
            durationDays, interval, intervalCount=1 } = req.body;

    if (!name || !type || !amount) return res.status(400).json({ message: "Missing name/type/amount" });

    // 1) Tạo Product
    const product = await stripe.products.create({ name, description });

    // 2) Tạo Price (one-time hoặc subscription)
    let price;
    if (type === "subscription") {
      if (!interval) return res.status(400).json({ message: "Missing interval for subscription" });
      price = await stripe.prices.create({
        unit_amount: amount, currency,
        recurring: { interval, interval_count: intervalCount },
        product: product.id,
      });
    } else {
      if (!durationDays) return res.status(400).json({ message: "Missing durationDays for one_time" });
      price = await stripe.prices.create({
        unit_amount: amount, currency,
        product: product.id,
      });
    }

    // 3) Lưu DB
    const plan = await VipPlanModel.create({
      name, description, type, amount, currency,
      durationDays: type === "one_time" ? durationDays : null,
      interval: type === "subscription" ? interval : null,
      intervalCount: type === "subscription" ? intervalCount : null,
      stripeProductId: product.id,
      stripePriceId: price.id,
      active: true,
    });

    return res.json({ ok: true, plan });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Create plan failed", error: e.message });
  }
};

export const getAllVipPlans = async (req, res) => {
  const plans = await VipPlanModel.findAll({ order: [["amount","ASC"]] });
  res.json({ ok: true, plans });
};

export const toggleVipPlan = async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  const plan = await VipPlanModel.findByPk(id);
  if (!plan) return res.status(404).json({ message: "Plan not found" });
  await plan.update({ active: !!active });
  res.json({ ok: true, plan });
};

export const deleteVipPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await VipPlanModel.findByPk(id);
    if (!plan) return res.status(404).json({ ok: false, message: "Plan not found" });

    await plan.update({ active: false });
    // (tuỳ chọn) bạn có thể deactivate price trên Stripe bằng 'active:false'
    try {
      await stripe.prices.update(plan.stripePriceId, { active: false });
    } catch (e) {
      // một số version Stripe không cho deactivate price đã dùng; bỏ qua nếu fail
      console.warn("[deleteVipPlan] stripe.prices.update failed:", e?.message);
    }

    return res.json({ ok: true, message: "Plan deactivated", plan });
  } catch (e) {
    console.error("[deleteVipPlan] error:", e);
    res.status(500).json({ ok: false, message: "Delete plan failed", error: e.message });
  }
};

export const updateVipPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await VipPlanModel.findByPk(id);
    if (!plan) return res.status(404).json({ ok: false, message: "Plan not found" });

    const {
      name,
      description,
      active,
      amount,
      currency,
      durationDays,      // for one_time
      interval,          // for subscription
      intervalCount,     // for subscription
    } = req.body || {};

    // 1) Update Stripe Product name/description nếu có
    const productUpdates = {};
    if (name) productUpdates.name = name;
    if (description !== undefined) productUpdates.description = description;
    if (Object.keys(productUpdates).length) {
      await stripe.products.update(plan.stripeProductId, productUpdates);
    }

    // 2) Nếu có thay đổi thông số tạo Price -> tạo Stripe Price mới
    let needNewPrice = false;

    // thay đổi về giá / tiền tệ
    if (amount !== undefined && amount !== plan.amount) needNewPrice = true;
    if (currency && currency !== plan.currency) needNewPrice = true;

    if (plan.type === "subscription") {
      if (interval && interval !== plan.interval) needNewPrice = true;
      if (intervalCount !== undefined && intervalCount !== plan.intervalCount) needNewPrice = true;
    } else {
      // one_time
      if (durationDays !== undefined && durationDays !== plan.durationDays) {
        // không cần tạo price mới chỉ vì durationDays; nhưng vẫn ghi nhận thay đổi ở DB
      }
    }

    let newStripePriceId = null;
    if (needNewPrice) {
      if (plan.type === "subscription") {
        const newPrice = await stripe.prices.create({
          unit_amount: amount ?? plan.amount,
          currency: (currency ?? plan.currency) || "vnd",
          recurring: {
            interval: interval ?? plan.interval ?? "month",
            interval_count: intervalCount ?? plan.intervalCount ?? 1,
          },
          product: plan.stripeProductId,
        });
        newStripePriceId = newPrice.id;
      } else {
        const newPrice = await stripe.prices.create({
          unit_amount: amount ?? plan.amount,
          currency: (currency ?? plan.currency) || "vnd",
          product: plan.stripeProductId,
        });
        newStripePriceId = newPrice.id;
      }
    }

    // 3) Cập nhật DB
    await plan.update({
      name: name ?? plan.name,
      description: description ?? plan.description,
      active: typeof active === "boolean" ? active : plan.active,

      amount: amount ?? plan.amount,
      currency: currency ?? plan.currency,

      durationDays: plan.type === "one_time"
        ? (durationDays ?? plan.durationDays)
        : plan.durationDays,

      interval: plan.type === "subscription"
        ? (interval ?? plan.interval)
        : null,

      intervalCount: plan.type === "subscription"
        ? (intervalCount ?? plan.intervalCount)
        : null,

      stripePriceId: newStripePriceId ?? plan.stripePriceId,
    });

    return res.json({ ok: true, plan });
  } catch (e) {
    console.error("[updateVipPlan] error:", e);
    res.status(500).json({ ok: false, message: "Update plan failed", error: e.message });
  }
};