// model/contract.model.js
import { DataTypes } from "sequelize";

export const createContractModel = (sequelize) => {
  const Contract = sequelize.define("Contracts", {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    buyerId:  { type: DataTypes.INTEGER, allowNull: false },
    sellerId: { type: DataTypes.INTEGER, allowNull: false },

    // [UPDATED] cho phép null vì chưa gán ở bước 2
    staffId:     { type: DataTypes.INTEGER, allowNull: true },
    agreedPrice: { type: DataTypes.FLOAT,   allowNull: true },
    postId:      { type: DataTypes.INTEGER, allowNull: false },

    // Phí theo %
    buyerFeePercent:  { type: DataTypes.FLOAT, defaultValue: 0, validate: { min: 0, max: 100 } },
    sellerFeePercent: { type: DataTypes.FLOAT, defaultValue: 0, validate: { min: 0, max: 100 } },

    // Lịch hẹn
    appointmentTime:  { type: DataTypes.DATE,   allowNull: true },
    appointmentPlace: { type: DataTypes.STRING, allowNull: true },
    appointmentNote:  { type: DataTypes.TEXT,   allowNull: true },

    // Trạng thái
    status: {
      type: DataTypes.ENUM(
        "pending",       // mới tạo
        "negotiating",   // đang thương lượng / đã có lịch hẹn
        "awaiting_sign", // chờ ký OTP
        "signed",        // hai bên đã ký
        "notarizing",    // đang công chứng
        "completed",     // hoàn tất thủ tục
        "cancelled"      // hủy
      ),
      defaultValue: "pending",
    },

    // Mốc hoàn tất
    signedAt:    { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },

    // [ADDED] OTP + hết hạn + số lần thử
    buyerOtp:           { type: DataTypes.STRING,  allowNull: true },
    sellerOtp:          { type: DataTypes.STRING,  allowNull: true },
    buyerOtpExpiresAt:  { type: DataTypes.DATE,    allowNull: true }, // hết hạn OTP buyer
    sellerOtpExpiresAt: { type: DataTypes.DATE,    allowNull: true }, // hết hạn OTP seller
    buyerOtpAttempts:   { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    sellerOtpAttempts:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    // [ADDED] thời điểm mỗi bên đã ký (sau khi OTP đúng)
    buyerSignedAt:  { type: DataTypes.DATE, allowNull: true },
    sellerSignedAt: { type: DataTypes.DATE, allowNull: true },

    // Ghi chú chung
    notes: { type: DataTypes.TEXT, allowNull: true },
  });

  return Contract;
};
