// postgres/postgres.js
import { Sequelize } from "sequelize";
import { createUserModel } from "../model/userSchema.js";
import dotenv from "dotenv";

dotenv.config();

// CHANGED: thêm port mặc định, fallback dialect, tắt logging, và SSL cho production
export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,              // CHANGED
    dialect: process.env.DB_DIALECT || "postgres",  // CHANGED
    logging: false,                                  // CHANGED
    dialectOptions: {                                // CHANGED
      ssl:
        process.env.NODE_ENV === "production"
          ? { require: true, rejectUnauthorized: false }
          : false,
    },
  }
);

// CHANGED: tạo model NGAY LẬP TỨC để không bao giờ là null
export const UserModel = createUserModel(sequelize); // CHANGED

// CHANGED: sync có điều kiện; KHÔNG force ở production
export const connection = async () => {
  try {
    await sequelize.authenticate();
    const force =
      (process.env.DB_SYNC_FORCE === "true" || process.env.NODE_ENV === "development") &&
      process.env.DB_SYNC_FORCE !== "false";
    await sequelize.sync(force ? { force: true } : undefined); // CHANGED
    console.log("Database Synced");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    throw error; // CHANGED: ném lỗi ra để server không start khi DB fail
  }
};
