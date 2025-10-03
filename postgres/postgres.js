// postgres/postgres.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import dns from "node:dns";
import { createUserModel } from "../model/userSchema.js";

dotenv.config();

// Ép Node ưu tiên IPv4 (tránh ENETUNREACH khi môi trường không có IPv6)
dns.setDefaultResultOrder?.("ipv4first");

// Ưu tiên URL Pooler nếu có, fallback sang DATABASE_URL thường
const DB_URL = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
if (!DB_URL) {
  throw new Error(
    "Missing DATABASE_URL (khuyến nghị dùng Supabase Connection Pooler URL: port 6543)"
  );
}

const u = new URL(DB_URL);
console.log(`[DB] host=${u.hostname} port=${u.port || "5432"}`);

export const sequelize = new Sequelize(DB_URL, {
  dialect: "postgres",
  protocol: "postgres",
  host: u.hostname,
  port: Number(u.port) || 5432,
  // BẮT BUỘC với Supabase: SSL + servername (SNI) để TLS hợp lệ
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false, servername: u.hostname },
  },
  // Bật log SQL khi cần: đặt SQL_LOG=true trong env
  logging: process.env.SQL_LOG === "true" ? console.log : false,
});

// Khởi tạo model NGAY để tránh UserModel=null
export const UserModel = createUserModel(sequelize);

// Kết nối + sync schema
// Dev: alter (mặc định). Prod: tránh force. Muốn reset sạch => SYNC_STRATEGY=force
export const connectDB = async () => {
  await sequelize.authenticate();
  const strategy = (process.env.SYNC_STRATEGY || "alter").toLowerCase();
  if (strategy === "force") {
    console.warn("⚠️ sequelize.sync({ force:true }) sẽ DROP toàn bộ bảng!");
    await sequelize.sync({ force: true });
  } else {
    await sequelize.sync({ alter: true });
  }
  console.log("✅ Database connected & synced");
};

// Giữ alias cho code cũ (nếu bạn đang gọi connection())
export const connection = connectDB;
