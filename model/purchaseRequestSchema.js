import { DataTypes } from "sequelize";

export const createPurchaseRequestModel = (sequelize) => {
  const PurchaseRequest = sequelize.define(
    "PurchaseRequests",
    {
      // 🔑 Khóa chính
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // 🧍‍♂️ Người mua
      buyerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },

      // 🧍‍♀️ Người bán (lấy từ bài post)
      sellerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },

      // 🔗 Bài đăng được gửi yêu cầu mua
      postId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Posts", key: "id" },
        onDelete: "CASCADE",
      },

      // 💬 Tin nhắn hoặc ghi chú của buyer
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // 📦 Trạng thái yêu cầu
      status: {
        type: DataTypes.ENUM(
          "pending",    // Buyer gửi, chờ xử lý
          "accepted",   // Đã chấp nhận → tạo Contract
          "rejected",   // Bị từ chối
          "withdrawn",  // Buyer tự rút
          "expired"     // Hết hạn
        ),
        allowNull: false,
        defaultValue: "pending",
      },

      // ❌ Lý do từ chối
      rejectReason: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // 🧑‍💼 Admin/Staff xử lý yêu cầu
      handledBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onDelete: "SET NULL",
      },

      // ⏰ Thời điểm hết hạn yêu cầu
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // 📝 Ghi chú nội bộ (staff/admin)
      internalNote: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "PurchaseRequests",
      timestamps: true,
    }
  );

  return PurchaseRequest;
};
