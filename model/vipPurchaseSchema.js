// ../model/vipPurchaseSchema.js
import { DataTypes } from "sequelize";

export const createVipPurchaseModel = (sequelize) => {
  const VipPurchase = sequelize.define(
    "VipPurchases",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

      // FK tới Users
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },

      // 🧩 NEW: FK tới bài đăng (Post)
      postId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Posts", key: "id" },
        onDelete: "CASCADE",
        comment: "Giao dịch này áp dụng cho bài đăng nào",
      },

      // 🧩 NEW: FK tới gói VIP (VipPlan)
      vipPlanId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "VipPlans", key: "id" },
        onDelete: "SET NULL",
        comment: "Giao dịch này dùng gói VIP nào",
      },

      provider: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "stripe", // bạn đang dùng Stripe
        validate: { len: [2, 50] },
      },

      // Mã đơn hàng nội bộ (map với Checkout Session / PaymentIntent)
      orderCode: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        validate: { len: [4, 64] },
      },

      // Tổng tiền (VND)
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 0 },
      },

      status: {
        type: DataTypes.ENUM("PENDING", "PAID", "CANCELED", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING",
      },

      // Lưu payload trả về từ gateway (Checkout Session, PaymentIntent, evt webhook...)
      rawPayload: {
        type: DataTypes.JSONB, // JSONB chỉ có trên Postgres
        allowNull: true,
      },
    },
    {
      indexes: [
        { fields: ["userId"] },
        { fields: ["postId"] }, // 🧩 NEW
        { fields: ["vipPlanId"] }, // 🧩 NEW
        { unique: true, fields: ["orderCode"] },
        { fields: ["status"] },
        { fields: ["provider"] },
        { fields: ["userId", "status"] }, // Tìm nhanh giao dịch user
      ],
    }
  );

  return VipPurchase;
};
