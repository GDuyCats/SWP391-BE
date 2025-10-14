import { DataTypes } from "sequelize";
export const createVipPlanModel = (sequelize) => {
  const VipPlan = sequelize.define("VipPlans", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },                    // VD: "VIP 30 ngày"
    description: { type: DataTypes.TEXT, allowNull: true },
    type: {                                                                 // 'one_time' | 'subscription'
      type: DataTypes.ENUM("one_time", "subscription"),
      allowNull: false,
      defaultValue: "one_time",
    },
    amount: { type: DataTypes.INTEGER, allowNull: false },                  // VND, integer
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "vnd" },

    // one-time:
    durationDays: { type: DataTypes.INTEGER, allowNull: true },             // ví dụ 30

    // subscription:
    interval: { type: DataTypes.ENUM("day","week","month","year"), allowNull: true },
    intervalCount: { type: DataTypes.INTEGER, allowNull: true },            // ví dụ 1 (1 month)

    // Stripe refs:
    stripeProductId: { type: DataTypes.STRING, allowNull: false },
    stripePriceId: { type: DataTypes.STRING, allowNull: false },

    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  });

  return VipPlan;
};