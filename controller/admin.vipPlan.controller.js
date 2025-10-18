// controller/admin.plan.controller.js
import Stripe from "stripe";
import { VipPlanModel } from "../postgres/postgres.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// ====== Constants & helpers ======
const ALLOWED_TIERS = ["diamond", "gold", "silver"]; // slug hợp lệ (map sang vipTier của Post)
const isPositiveInt = (v) => Number.isInteger(v) && v >= 1;
const toTierSlug = (s) => String(s ?? "").trim().toLowerCase();

/**
 * ADMIN: Tạo gói VIP mới
 * - BẮT BUỘC: name, type, amount, slug (∈ ALLOWED_TIERS), priority (int ≥ 1)
 * - one_time  -> durationDays bắt buộc (int ≥ 1)
 * - subscription -> interval & intervalCount bắt buộc (int ≥ 1)
 * - KHÔNG kiểm tra unique slug (theo yêu cầu)
 */
export const createVipPlan = async (req, res) => {
  try {
    let {
      name,
      description,
      type,
      amount,
      currency = "vnd",
      durationDays,
      interval,
      intervalCount = 1,
      priority,
      slug,
    } = req.body || {};

    // --- validate cơ bản ---
    if (!name || !type || amount == null) {
      return res.status(400).json({ message: "Missing name/type/amount" });
    }
    amount = Number(amount);
    if (!(amount > 0)) {
      return res.status(400).json({ message: "amount phải > 0 (đơn vị: VND)" });
    }

    // --- validate slug & priority ---
    slug = toTierSlug(slug);
    if (!slug || !ALLOWED_TIERS.includes(slug)) {
      return res.status(400).json({
        message: `slug là bắt buộc và phải thuộc một trong: ${ALLOWED_TIERS.join(", ")}`,
      });
    }
    if (priority == null) {
      return res.status(400).json({ message: "priority là bắt buộc" });
    }
    priority = Number(priority);
    if (!isPositiveInt(priority)) {
      return res.status(400).json({ message: "priority phải là số nguyên ≥ 1" });
    }
    if (priority >= 10) {
      return res.status(400).json({ message: "priority phải nhỏ hơn 10" });
    }

    // --- validate theo type ---
    if (type === "subscription") {
      if (!interval || !isPositiveInt(Number(intervalCount))) {
        return res.status(400).json({
          message: "Subscription cần interval và intervalCount (số nguyên ≥ 1)",
        });
      }
    } else if (type === "one_time") {
      if (!isPositiveInt(Number(durationDays))) {
        return res.status(400).json({
          message: "One-time cần durationDays (số nguyên ≥ 1)",
        });
      }
    } else {
      return res.status(400).json({ message: "type phải là 'one_time' hoặc 'subscription'" });
    }

    // 1) Tạo Product Stripe
    const product = await stripe.products.create({ name, description });

    // 2) Tạo Price Stripe
    let price;
    if (type === "subscription") {
      price = await stripe.prices.create({
        unit_amount: amount,
        currency,
        recurring: { interval, interval_count: Number(intervalCount) },
        product: product.id,
      });
    } else {
      price = await stripe.prices.create({
        unit_amount: amount,
        currency,
        product: product.id,
      });
    }

    // 3) Lưu DB
    const plan = await VipPlanModel.create({
      name,
      description,
      type,
      amount,
      currency,
      durationDays: type === "one_time" ? Number(durationDays) : null,
      interval: type === "subscription" ? interval : null,
      intervalCount: type === "subscription" ? Number(intervalCount) : null,
      stripeProductId: product.id,
      stripePriceId: price.id,
      active: true,
      priority,
      slug, // KHÔNG unique, chỉ cần hợp lệ
    });

    return res.status(201).json({ ok: true, plan });
  } catch (e) {
    console.error("[createVipPlan] error:", e);

    // Bắt lỗi slug trùng (hoặc các lỗi validate Sequelize)
    if (e.name === "SequelizeUniqueConstraintError" || e.name === "SequelizeValidationError") {
      const field = e.errors?.[0]?.path || "unknown";
      return res.status(400).json({
        message: `Lỗi dữ liệu không hợp lệ: ${field === "slug" ? "slug bị trùng" : field}`,
        error: e.message,
      });
    }

    return res.status(500).json({ message: "Create plan failed", error: e.message });
  }
};

/**
 * ADMIN: Lấy danh sách tất cả gói VIP
 */
export const getAllVipPlans = async (_req, res) => {
  const plans = await VipPlanModel.findAll({
    order: [["priority", "DESC"], ["amount", "ASC"]],
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
      if (plan.stripePriceId) {
        await stripe.prices.update(plan.stripePriceId, { active: false });
      }
    } catch (e) {
      console.warn("[deleteVipPlan] stripe.prices.update failed:", e?.message);
    }

    return res.json({ ok: true, message: "Plan deactivated", plan });
  } catch (e) {
    console.error("[createVipPlan] error:", e);

    // Bắt lỗi slug trùng (hoặc các lỗi validate Sequelize)
    if (e.name === "SequelizeUniqueConstraintError" || e.name === "SequelizeValidationError") {
      const field = e.errors?.[0]?.path || "unknown";
      return res.status(400).json({
        message: `Lỗi dữ liệu không hợp lệ: ${field === "slug" ? "slug bị trùng" : field}`,
        error: e.message,
      });
    }

    return res.status(500).json({ message: "Create plan failed", error: e.message });
  }
};

/**
 * ADMIN: Cập nhật gói VIP
 * - Nếu đổi amount/currency/interval/intervalCount -> tạo Stripe Price mới
 * - Nếu đổi slug -> phải thuộc ALLOWED_TIERS (không cần unique)
 * - Nếu đổi priority -> validate số nguyên ≥ 1
 */
export const updateVipPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await VipPlanModel.findByPk(id);
    if (!plan) return res.status(404).json({ ok: false, message: "Plan not found" });

    let {
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

    // --- validate các trường đặc thù nếu có truyền vào ---
    if (slug !== undefined) {
      slug = toTierSlug(slug);
      if (!slug || !ALLOWED_TIERS.includes(slug)) {
        return res.status(400).json({
          message: `slug phải thuộc một trong: ${ALLOWED_TIERS.join(", ")}`,
        });
      }
    }

    if (priority !== undefined) {
      priority = Number(priority);
      if (!isPositiveInt(priority)) {
        return res.status(400).json({ message: "priority phải là số nguyên ≥ 1" });
      }
    }
    if (priority >= 10) {
      return res.status(400).json({ message: "priority phải nhỏ hơn 10" });
    }

    if (amount !== undefined) {
      amount = Number(amount);
      if (!(amount > 0)) {
        return res.status(400).json({ message: "amount phải > 0 (đơn vị: VND)" });
      }
    }

    if (plan.type === "subscription") {
      if (interval !== undefined && !interval) {
        return res.status(400).json({ message: "interval không được rỗng cho subscription" });
      }
      if (intervalCount !== undefined && !isPositiveInt(Number(intervalCount))) {
        return res.status(400).json({ message: "intervalCount phải là số nguyên ≥ 1" });
      }
    } else {
      if (durationDays !== undefined && !isPositiveInt(Number(durationDays))) {
        return res.status(400).json({ message: "durationDays phải là số nguyên ≥ 1" });
      }
    }

    // 1) Update Stripe Product nếu đổi name/description
    const productUpdates = {};
    if (name) productUpdates.name = name;
    if (description !== undefined) productUpdates.description = description;
    if (Object.keys(productUpdates).length) {
      await stripe.products.update(plan.stripeProductId, productUpdates);
    }

    // 2) Nếu đổi thông số dùng tạo Price -> tạo Price mới
    let needNewPrice = false;
    if (amount !== undefined && amount !== plan.amount) needNewPrice = true;
    if (currency !== undefined && currency !== plan.currency) needNewPrice = true;
    if (plan.type === "subscription") {
      if (interval !== undefined && interval !== plan.interval) needNewPrice = true;
      if (intervalCount !== undefined && Number(intervalCount) !== plan.intervalCount) needNewPrice = true;
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
          interval_count: Number(intervalCount ?? plan.intervalCount ?? 1),
        };
      }
      const newPrice = await stripe.prices.create(priceOpts);
      newStripePriceId = newPrice.id;
    }

    // 3) Cập nhật DB
    await plan.update({
      name: name ?? plan.name,
      description: description ?? plan.description,
      active: typeof active === "boolean" ? active : plan.active,

      amount: amount ?? plan.amount,
      currency: currency ?? plan.currency,

      durationDays:
        plan.type === "one_time"
          ? (durationDays !== undefined ? Number(durationDays) : plan.durationDays)
          : plan.durationDays,

      interval: plan.type === "subscription" ? (interval ?? plan.interval) : null,
      intervalCount:
        plan.type === "subscription"
          ? (intervalCount !== undefined ? Number(intervalCount) : plan.intervalCount)
          : null,

      stripePriceId: newStripePriceId ?? plan.stripePriceId,

      priority: priority ?? plan.priority,
      slug: slug ?? plan.slug,
    });

    return res.json({ ok: true, plan });
  } catch (e) {
    console.error("[updateVipPlan] error:", e);
    res.status(500).json({ ok: false, message: "Update plan failed", error: e.message });
  }
};
