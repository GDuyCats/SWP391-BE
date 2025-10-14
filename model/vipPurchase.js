// ../model/vipPurchaseSchema.js
import { DataTypes } from "sequelize";

export const createVipPurchaseModel = (sequelize) => {
  const VipPurchase = sequelize.define("VipPurchases", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    // FK tới Users
    userId: { type: DataTypes.INTEGER, allowNull: false },

    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "stripe", // bạn đang dùng Stripe
      validate: { len: [2, 50] },
    },

    // Mã đơn hàng nội bộ của bạn (để mapping với Checkout Session / PaymentIntent)
    orderCode: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      validate: { len: [4, 64] },
    },

    // Tổng tiền (VND) – integer
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
      // JSONB chỉ có trên Postgres
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    indexes: [
      { fields: ["userId"] },
      { unique: true, fields: ["orderCode"] },
      { fields: ["status"] },
      { fields: ["provider"] },
      // Tìm nhanh các giao dịch gần đây của user
      { fields: ["userId", "status"] },
    ],
  });

  return VipPurchase;
};
