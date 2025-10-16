import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import dns from "node:dns";
import { createUserModel } from "../model/userSchema.js";
import { createPostModel } from "../model/postsSchema.js";
import { createVipPurchaseModel } from "../model/vipPurchase.js"; // [ADDED] 👈
import { createVipPlanModel } from "../model/vipPlanSchema.js";
import { createContractModel } from "../model/contractSchema.js"
dotenv.config();

dns.setDefaultResultOrder?.("ipv4first");
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
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false, servername: u.hostname },
  },
  logging: process.env.SQL_LOG === "true" ? console.log : false,
});

// ===== Models =====
export const UserModel = createUserModel(sequelize);
export const PostModel = createPostModel(sequelize);
export const VipPurchaseModel = createVipPurchaseModel(sequelize); // [ADDED] 👈
export const VipPlanModel = createVipPlanModel(sequelize);
export const ContractModel = createContractModel(sequelize);
// ===== Associations =====
UserModel.hasMany(PostModel, { foreignKey: "userId", onDelete: "CASCADE" });
PostModel.belongsTo(UserModel, { foreignKey: "userId" });
// [ADDED] Quan hệ Contract ↔ User (buyer/seller/staff)
ContractModel.belongsTo(UserModel, { as: "buyer",  foreignKey: "buyerId" });
ContractModel.belongsTo(UserModel, { as: "seller", foreignKey: "sellerId" });
ContractModel.belongsTo(UserModel, { as: "staff",  foreignKey: "staffId" });
// (tuỳ chọn, KHÔNG bắt buộc) nếu cần truy ngược từ User:
UserModel.hasMany(ContractModel, { as: "contractsAsBuyer",  foreignKey: "buyerId" });
UserModel.hasMany(ContractModel, { as: "contractsAsSeller", foreignKey: "sellerId" });
UserModel.hasMany(ContractModel, { as: "contractsAsStaff",  foreignKey: "staffId" });
// [ADDED] Quan hệ User ↔ VipPurchases
UserModel.hasMany(VipPurchaseModel, { foreignKey: "userId", onDelete: "CASCADE" });
VipPurchaseModel.belongsTo(UserModel, { foreignKey: "userId" });

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

export const connection = connectDB;
