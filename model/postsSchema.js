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
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },

      thumbnail: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          is: /^(?:\+84|0)(?:\d{9,10})$/,
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
        defaultValue: 0,
      },

      vipPlanId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "VipPlans", key: "id" },
        onDelete: "SET NULL",
        comment: "Gói VIP được áp vào bài này",
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      
      saleStatus: {   
        type: DataTypes.ENUM("available", "sold"),
        allowNull: false,
        defaultValue: "available",
      },

      verifyStatus: {
        type: DataTypes.ENUM("verify", "nonverify"),
        allowNull: false,
        defaultValue: "nonverify",
      },

      category: {
        type: DataTypes.ENUM("battery", "vehicle"),
        allowNull: false,
        defaultValue: "vehicle",
      },
    },
    {
      indexes: [
        { fields: ["isActive"] },
        { fields: ["verifyStatus"] },
        { fields: ["category"] },
        { fields: ["price"] },
        { fields: ["userId"] },
        { fields: ["vipPlanId"] },
        { fields: ["vipPriority"] },
        { fields: ["vipExpiresAt"] },
        { fields: ["isVip", "vipExpiresAt", "vipPriority"] },
        { fields: ["createdAt"] },
      ],

      // validate: {
      //   vipConsistency() {
      //     // ❗ Chỉ validate nếu có đụng vào trường VIP
      //     const touchedVipFields =
      //       this.changed("isVip") ||
      //       this.changed("vipExpiresAt") ||
      //       this.changed("vipPriority") ||
      //       this.changed("vipTier");

      //     if (!touchedVipFields) {
      //       return;
      //     }

      //     // Nếu có chỉnh VIP -> enforce rule
      //     if (this.isVip) {
      //       if (!this.vipExpiresAt) {
      //         throw new Error("vipExpiresAt is required when isVip = true");
      //       }
      //       if (!this.vipPriority || this.vipPriority < 1) {
      //         throw new Error(
      //           "vipPriority must be >= 1 when isVip = true"
      //         );
      //       }
      //       if (!this.vipTier) {
      //         throw new Error("vipTier is required when isVip = true");
      //       }
      //     }
      //   },
      // },
    }
  );

  return Post;
};
