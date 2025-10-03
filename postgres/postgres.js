// postgres/postgres.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import { createUserModel } from "../model/userSchema.js";

dotenv.config();

/**
 * Ưu tiên dùng URL của Connection Pooler (Supabase) để tránh IPv6 và giới hạn connection.
 * - DATABASE_URL_POOLED: ví dụ: postgresql://...@<project>.pooler.supabase.com:6543/postgres?pgbouncer=true
 * - Fallback: DATABASE_URL (host db.xxxxx.supabase.co:5432)
 */
const DB_URL = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

export const sequelize = new Sequelize(DB_URL, {
  dialect: "postgres",
  protocol: "postgres",
  // BẮT BUỘC với Supabase/Railway: dùng SSL; không verify CA để tránh self-signed.
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  // Bật/tắt log SQL qua env
  logging: process.env.SQL_LOG === "true" ? console.log : false,
  // ÉP dùng host từ URL (tránh một số môi trường ưu tiên IPv6)
  host: new URL(DB_URL).hostname,
});

// Khởi tạo model NGAY (tránh UserModel=null)
export const UserModel = createUserModel(sequelize);

/**
 * Kết nối + sync schema.
 * - Ở dev: SYNC_STRATEGY=alter (mặc định). Ở prod KHÔNG dùng force.
 *   Đổi bằng env nếu thật sự cần reset data: SYNC_STRATEGY=force
 */
export const connectDB = async () => {
  await sequelize.authenticate();
  const strategy = (process.env.SYNC_STRATEGY || "alter").toLowerCase();
  if (strategy === "force") {
    console.warn("⚠️  sequelize.sync({ force: true }) – toàn bộ bảng sẽ bị DROP!");
    await sequelize.sync({ force: true });
  } else {
    await sequelize.sync({ alter: true });
  }
  console.log("✅ Database connected & synced");
};
