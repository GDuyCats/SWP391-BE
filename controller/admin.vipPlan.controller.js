// controller/admin.plan.controller.js
import Stripe from "stripe";
import { VipPlanModel } from "../postgres/postgres.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

/**
 * ADMIN: Tạo gói VIP mới
 */
export const createVipPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      amount,
      currency = "vnd",
      durationDays,
      interval,
      intervalCount = 1,
      priority = 1, // 🧩 NEW: thứ tự ưu tiên hiển thị
      slug,         // 🧩 NEW: tên định danh ngắn (ví dụ 'diamond','gold')
    } = req.body;

    if (!name || !type || !amount)
      return res.status(400).json({ message: "Missing name/type/amount" });

    if (amount <= 0)
      return res.status(400).json({ message: "amount phải > 0 (đơn vị: VND)" });

    // 1️⃣ Tạo Product trên Stripe
    const product = await stripe.products.create({ name, description });

    // 2️⃣ Tạo Price (one_time hoặc subscription)
    let price;
    if (type === "subscription") {
      if (!interval)
        return res.status(400).json({ message: "Missing interval for subscription" });
      price = await stripe.prices.create({
        unit_amount: amount,
        currency,
        recurring: { interval, interval_count: intervalCount },
        product: product.id,
      });
    } else {
      if (!durationDays)
        return res.status(400).json({ message: "Missing durationDays for one_time" });
      price = await stripe.prices.create({
        unit_amount: amount,
        currency,
        product: product.id,
      });
    }

    // 3️⃣ Lưu DB
    const plan = await VipPlanModel.create({
      name,
      description,
      type,
      amount,
      currency,
      durationDays: type === "one_time" ? durationDays : null,
      interval: type === "subscription" ? interval : null,
      intervalCount: type === "subscription" ? intervalCount : null,
      stripeProductId: product.id,
      stripePriceId: price.id,
      active: true,
      priority, // 🧩 NEW
      slug: slug || name.toLowerCase().replace(/\s+/g, "_"), // 🧩 NEW
    });

    return res.json({ ok: true, plan });
  } catch (e) {
    console.error("[createVipPlan] error:", e);
    return res.status(500).json({ message: "Create plan failed", error: e.message });
  }
};

/**
 * ADMIN: Lấy danh sách tất cả gói VIP
 */
export const getAllVipPlans = async (req, res) => {
  const plans = await VipPlanModel.findAll({
    order: [["priority", "DESC"], ["amount", "ASC"]], // 🧩 sort ưu tiên trước
  });
  res.json({ ok: true, plans });
};

/**
 * ADMIN: Bật / tắt gói VIP
 */
export const toggleVipPlan = async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;
  const plan = await VipPlanModel.findByPk(id);
  if (!plan) return res.status(404).json({ message: "Plan not found" });

  await plan.update({ active: !!active });
  res.json({ ok: true, plan });
};

/**
 * ADMIN: Vô hiệu hóa gói (và ngưng trên Stripe)
 */
export const deleteVipPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await VipPlanModel.findByPk(id);
    if (!plan) return res.status(404).json({ ok: false, message: "Plan not found" });

    await plan.update({ active: false });

    try {
      // Stripe có thể không cho deactivate Price đang dùng, nên bắt lỗi nhẹ
      await stripe.prices.update(plan.stripePriceId, { active: false });
    } catch (e) {
      console.warn("[deleteVipPlan] stripe.prices.update failed:", e?.message);
    }

    return res.json({ ok: true, message: "Plan deactivated", plan });
  } catch (e) {
    console.error("[deleteVipPlan] error:", e);
    res.status(500).json({ ok: false, message: "Delete plan failed", error: e.message });
  }
};

/**
 * ADMIN: Cập nhật gói VIP (tự động tạo price mới nếu cần)
 */
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
      durationDays,
      interval,
      intervalCount,
      priority,
      slug,
    } = req.body || {};

    // 1️⃣ Update Stripe Product nếu có thay đổi tên/mô tả
    const productUpdates = {};
    if (name) productUpdates.name = name;
    if (description !== undefined) productUpdates.description = description;
    if (Object.keys(productUpdates).length) {
      await stripe.products.update(plan.stripeProductId, productUpdates);
    }

    // 2️⃣ Nếu đổi giá / interval → tạo Price mới
    let needNewPrice = false;
    if (amount && amount !== plan.amount) needNewPrice = true;
    if (currency && currency !== plan.currency) needNewPrice = true;
    if (plan.type === "subscription") {
      if (interval && interval !== plan.interval) needNewPrice = true;
      if (intervalCount && intervalCount !== plan.intervalCount) needNewPrice = true;
    }

    let newStripePriceId = null;
    if (needNewPrice) {
      const priceOpts = {
        unit_amount: amount ?? plan.amount,
        currency: currency ?? plan.currency,
        product: plan.stripeProductId,
      };
      if (plan.type === "subscription") {
        priceOpts.recurring = {
          interval: interval ?? plan.interval,
          interval_count: intervalCount ?? plan.intervalCount ?? 1,
        };
      }
      const newPrice = await stripe.prices.create(priceOpts);
      newStripePriceId = newPrice.id;
    }

    // 3️⃣ Cập nhật DB
    await plan.update({
      name: name ?? plan.name,
      description: description ?? plan.description,
      active: typeof active === "boolean" ? active : plan.active,
      amount: amount ?? plan.amount,
      currency: currency ?? plan.currency,
      durationDays: plan.type === "one_time"
        ? durationDays ?? plan.durationDays
        : plan.durationDays,
      interval: plan.type === "subscription" ? interval ?? plan.interval : null,
      intervalCount: plan.type === "subscription" ? intervalCount ?? plan.intervalCount : null,
      stripePriceId: newStripePriceId ?? plan.stripePriceId,
      priority: priority ?? plan.priority, // 🧩 NEW
      slug: slug ?? plan.slug,             // 🧩 NEW
    });

    return res.json({ ok: true, plan });
  } catch (e) {
    console.error("[updateVipPlan] error:", e);
    res.status(500).json({ ok: false, message: "Update plan failed", error: e.message });
  }
};
