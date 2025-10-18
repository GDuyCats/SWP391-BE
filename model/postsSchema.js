import { DataTypes } from "sequelize";

export const createPostModel = (sequelize) => {
  const Post = sequelize.define(
    "Posts",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // 👉 NEW: đảm bảo bài thuộc về 1 user (controller của bạn đang dùng userId)
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },

      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      image: {
        type: DataTypes.ARRAY(DataTypes.STRING), // lưu URL hoặc đường dẫn
        allowNull: true,
      },
      thumbnail: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(15, 2), // ví dụ: 999999999999.99
        allowNull: false,
        defaultValue: 0,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          is: /^(?:\+84|0)(?:\d{9,10})$/, // giống validate phone trong user
        },
      },

      // ===== VIP theo bài =====
      isVip: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment:
          "Bài VIP trong khoảng thời gian; khi hết hạn cron sẽ set false + nonverify + isActive=false",
      },
      vipExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      vipTier: {
        type: DataTypes.ENUM("diamond", "gold", "silver"),
        allowNull: true,
      },
      vipPriority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0, // 3 > 2 > 1 > 0
      },

      // 👉 NEW: tham chiếu gói đã chọn khi đăng (VipPlans)
      vipPlanId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "VipPlans", key: "id" },
        onDelete: "SET NULL",
        comment: "Gói VIP được áp vào bài này",
      },

      // Trạng thái hiển thị công khai
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "false => ẩn khỏi public (hết hạn VIP / bị gỡ)",
      },

      verifyStatus: {
        type: DataTypes.ENUM("verify", "nonverify"),
        allowNull: false,
        defaultValue: "nonverify",
      },
      category: {
        type: DataTypes.ENUM("battery", "vehicle"),
        allowNull: false,
        defaultValue: "vehicle", // mặc định là vehicle
      },
    },
    {
      // 👉 NEW: index để tối ưu filter/sort theo luồng mới
      indexes: [
        { fields: ["isActive"] },
        { fields: ["verifyStatus"] },
        { fields: ["category"] },
        { fields: ["price"] },
        { fields: ["userId"] },
        { fields: ["vipPlanId"] },
        { fields: ["vipPriority"] },
        { fields: ["vipExpiresAt"] },
        // lọc VIP còn hạn nhanh
        { fields: ["isVip", "vipExpiresAt", "vipPriority"] },
        // sắp xếp mặc định theo thời gian
        { fields: ["createdAt"] },
      ],

      // 👉 NEW: ràng buộc nhẹ để tránh trạng thái VIP sai
      validate: {
        vipConsistency() {
          if (this.isVip) {
            if (!this.vipExpiresAt) {
              throw new Error("vipExpiresAt is required when isVip = true");
            }
            if (!this.vipPriority || this.vipPriority < 1) {
              throw new Error("vipPriority must be >= 1 when isVip = true");
            }
            if (!this.vipTier) {
              throw new Error("vipTier is required when isVip = true");
            }
          }
        },
      },
    }
  );

  return Post;
};
