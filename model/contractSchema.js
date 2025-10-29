// model/contract.model.js
import { DataTypes } from "sequelize";

export const createContractModel = (sequelize) => {
  const Contract = sequelize.define(
    "Contracts",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

      // Các bên tham gia
      buyerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      sellerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      // có thể chưa gán ở bước đầu
      staffId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onDelete: "SET NULL",
      },

      postId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Posts", key: "id" },
        onDelete: "CASCADE",
      },

      // Giá & phí
      agreedPrice: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
      buyerFeePercent: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
      },
      sellerFeePercent: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
      },

      // Lịch hẹn
      appointmentTime: { type: DataTypes.DATE, allowNull: true },
      appointmentPlace: { type: DataTypes.STRING, allowNull: true },
      appointmentNote: { type: DataTypes.TEXT, allowNull: true },

      // Trạng thái
      status: {
        type: DataTypes.ENUM(
          "pending",       // mới tạo
          "negotiating",   // đang thương lượng/đã có lịch hẹn
          "awaiting_sign", // chờ ký OTP
          "signed",        // hai bên đã ký
          "notarizing",    // đang công chứng
          "completed",     // hoàn tất thủ tục
          "cancelled"      // hủy
        ),
        defaultValue: "pending",
        allowNull: false,
      },
      cancelReason: { type: DataTypes.STRING, allowNull: true },

      // Mốc thời gian
      signedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },

      // OTP & ký
      buyerOtp: { type: DataTypes.STRING, allowNull: true },
      sellerOtp: { type: DataTypes.STRING, allowNull: true },
      buyerOtpExpiresAt: { type: DataTypes.DATE, allowNull: true },
      sellerOtpExpiresAt: { type: DataTypes.DATE, allowNull: true },
      buyerOtpAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      sellerOtpAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      buyerSignedAt: { type: DataTypes.DATE, allowNull: true },
      sellerSignedAt: { type: DataTypes.DATE, allowNull: true },

      // Link sang PurchaseRequest (sau khi accept)
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "PurchaseRequests", key: "id" },
        onDelete: "SET NULL",
      },

      // Ghi chú chung
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "Contracts",
      indexes: [
        { fields: ["postId"] },
        { fields: ["buyerId"] },
        { fields: ["sellerId"] },
        { fields: ["staffId"] },
        { fields: ["requestId"] },
        { fields: ["status"] },
        { fields: ["createdAt"] },
      ],
    }
  );

  return Contract;
};
