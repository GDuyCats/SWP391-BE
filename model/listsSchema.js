import { DataTypes } from "sequelize";

export const createPostModel = (sequelize) => {
  const Post = sequelize.define("Posts", {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
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
      type: DataTypes.ARRAY(DataTypes.STRING),// lưu URL hoặc đường dẫn
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
    type: {
      type: DataTypes.ENUM("vip", "nonvip"),
      allowNull: false,
      defaultValue: "nonvip",
    },
     verifyStatus: {
      type: DataTypes.ENUM("verify", "nonverify"),
      allowNull: false,
      defaultValue: "nonverify",
    },
  });

  return Post;
};
