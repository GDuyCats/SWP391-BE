// model/contract.model.js
import { DataTypes } from "sequelize";

export const createContractModel = (sequelize) => {
  // Các key phí hợp lệ & người chịu phí hợp lệ
  const FEE_KEYS = [
    "brokerageFee",
    "titleTransferFee",
    "legalAndConditionCheckFee",
    "adminProcessingFee",
    "reinspectionOrRegistrationSupportFee",
  ];
  const FEE_PAYER = ["buyer", "seller"];

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

      // Giá bán được hai bên thống nhất
      agreedPrice: { type: DataTypes.DECIMAL(18, 2), allowNull: true },

      // ====== Các loại phí theo yêu cầu (giữ nguyên, không thêm/bớt) ======
      // 1) Phí môi giới giao dịch
      brokerageFee: { type: DataTypes.DECIMAL(18, 2), allowNull: true, defaultValue: 0 },

      // 2) Phí làm hồ sơ sang tên – đăng ký
      titleTransferFee: { type: DataTypes.DECIMAL(18, 2), allowNull: true, defaultValue: 0 },

      // 3) Phí kiểm tra pháp lý & tình trạng xe
      legalAndConditionCheckFee: { type: DataTypes.DECIMAL(18, 2), allowNull: true, defaultValue: 0 },

      // 4) Phí xử lý giấy tờ & hành chính
      adminProcessingFee: { type: DataTypes.DECIMAL(18, 2), allowNull: true, defaultValue: 0 },

      // 5) Phí kiểm định hoặc hỗ trợ đăng kiểm lại (nếu xe hết hạn)
      reinspectionOrRegistrationSupportFee: { type: DataTypes.DECIMAL(18, 2), allowNull: true, defaultValue: 0 },

      // === Bên chịu phí cho từng loại phí (JSONB) ===
      // Chỉ nhận "buyer" hoặc "seller" cho từng key phí ở trên (không có "shared")
      feeResponsibility: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {
          brokerageFee: "seller",
          titleTransferFee: "buyer",
          legalAndConditionCheckFee: "buyer",
          adminProcessingFee: "seller",
          reinspectionOrRegistrationSupportFee: "seller",
        },
        get() {
          const v = this.getDataValue("feeResponsibility");
          return v || {};
        },
        set(val) {
          // Cho phép set null/undefined => để nguyên
          if (val == null) {
            this.setDataValue("feeResponsibility", val);
            return;
          }
          // Chỉ nhận object, lọc key hợp lệ & chuẩn hóa về "buyer"/"seller"
          const cleaned = {};
          for (const k of Object.keys(val)) {
            if (FEE_KEYS.includes(k)) {
              const raw = val[k];
              const v = typeof raw === "string" ? raw.toLowerCase().trim() : raw;
              if (FEE_PAYER.includes(v)) {
                cleaned[k] = v;
              }
            }
          }
          // Merge với default cũ (giữ key không set)
          const current = this.getDataValue("feeResponsibility") || {};
          this.setDataValue("feeResponsibility", { ...current, ...cleaned });
        },
      },

      // Ghi chú phí (tuỳ chọn)
      feesNote: { type: DataTypes.TEXT, allowNull: true },

      // Lịch hẹn
      appointmentTime: { type: DataTypes.DATE, allowNull: true },
      appointmentPlace: { type: DataTypes.STRING, allowNull: true },
      appointmentNote: { type: DataTypes.TEXT, allowNull: true },

      // Trạng thái hợp đồng
      status: {
        type: DataTypes.ENUM(
          "pending",
          "negotiating",
          "awaiting_sign",
          "signed",
          "notarizing",
          "completed",
          "cancelled"
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

      // ====== Tổng phí dịch vụ (virtual) ======
      totalExtraFees: {
        type: DataTypes.VIRTUAL(DataTypes.DECIMAL(18, 2), [
          "brokerageFee",
          "titleTransferFee",
          "legalAndConditionCheckFee",
          "adminProcessingFee",
          "reinspectionOrRegistrationSupportFee",
        ]),
        get() {
          const toNum = (v) => (v == null ? 0 : parseFloat(v));
          const sum =
            toNum(this.getDataValue("brokerageFee")) +
            toNum(this.getDataValue("titleTransferFee")) +
            toNum(this.getDataValue("legalAndConditionCheckFee")) +
            toNum(this.getDataValue("adminProcessingFee")) +
            toNum(this.getDataValue("reinspectionOrRegistrationSupportFee"));
          return sum.toFixed(2);
        },
      },
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
      // Validate ở cấp model để chặn giá trị lạ cho feeResponsibility
      validate: {
        feeResponsibilityValid() {
          const fr = this.getDataValue("feeResponsibility");
          if (!fr) return;
          for (const [k, v] of Object.entries(fr)) {
            if (!FEE_KEYS.includes(k)) {
              throw new Error(`feeResponsibility contains invalid key: ${k}`);
            }
            if (!FEE_PAYER.includes(String(v).toLowerCase())) {
              throw new Error(`feeResponsibility.${k} must be 'buyer' or 'seller'`);
            }
          }
        },
      },
    }
  );

  return Contract;
};
