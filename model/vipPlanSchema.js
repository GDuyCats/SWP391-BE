import { DataTypes } from "sequelize";
export const createVipPlanModel = (sequelize) => {
  const VipPlan = sequelize.define("VipPlans", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false }, // VD: "VIP 30 ngày"
    description: { type: DataTypes.TEXT, allowNull: true },

    type: { // 'one_time' | 'subscription'
      type: DataTypes.ENUM("one_time", "subscription"),
      allowNull: false,
      defaultValue: "one_time",
    },

    amount: { type: DataTypes.INTEGER, allowNull: false }, // VND
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "vnd" },

    durationDays: { type: DataTypes.INTEGER, allowNull: true }, // ví dụ 30
    interval: { type: DataTypes.ENUM("day","week","month","year"), allowNull: true },
    intervalCount: { type: DataTypes.INTEGER, allowNull: true }, // ví dụ 1 (1 month)

    // 💡 THÊM 1: Mã ngắn/slug để định danh gói (vd: 'diamond', 'gold', 'silver')
    slug: { type: DataTypes.STRING, allowNull: false, unique: true},

    // 💡 THÊM 2: Thứ tự/ưu tiên hiển thị (kim cương > vàng > bạc)
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },

    // 💡 THÊM 3: Metadata mở rộng (badge color, icon, quyền lợi)

    // ⚠️ SỬA NHẸ: Cho phép null để không bắt buộc Stripe
    stripeProductId: { type: DataTypes.STRING, allowNull: true },
    stripePriceId: { type: DataTypes.STRING, allowNull: true },

    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });

  return VipPlan;
};
