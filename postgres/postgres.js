// postgres.js
import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import dns from "node:dns";
import { createUserModel } from "../model/userSchema.js";
import { createPostModel } from "../model/postsSchema.js";
import { createVipPurchaseModel } from "../model/vipPurchaseSchema.js";
import { createVipPlanModel } from "../model/vipPlanSchema.js";
import { createContractModel } from "../model/contractSchema.js";
import { createBatteryDetailModel } from "../model/batteryDetailSchema.js";
import { createVehicleDetailModel } from "../model/vehicleDetailSchema.js";
import { createPurchaseRequestModel } from "../model/purchaseRequestSchema.js";
dotenv.config();

// ===== Kết nối =====
dns.setDefaultResultOrder?.("ipv4first");
const DB_URL = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
if (!DB_URL) {
  throw new Error(
    "❌ Missing DATABASE_URL (Khuyến nghị: dùng Supabase Connection Pooler URL: port 6543)"
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
export const VipPlanModel = createVipPlanModel(sequelize);
export const PurchaseRequestModel = createPurchaseRequestModel(sequelize);
export const VipPurchaseModel = createVipPurchaseModel(sequelize);

export const ContractModel = createContractModel(sequelize);
export const BatteryDetailModel = createBatteryDetailModel(sequelize);
export const VehicleDetailModel = createVehicleDetailModel(sequelize);

// ===== Associations =====

// 👤 USER ↔ 📄 POST
UserModel.hasMany(PostModel, { foreignKey: "userId", onDelete: "CASCADE" });
PostModel.belongsTo(UserModel, { foreignKey: "userId" });

// 📄 POST ↔ 💎 VIP PLAN
// (Mỗi bài đăng được gắn với một gói VIP cụ thể)
VipPlanModel.hasMany(PostModel, { foreignKey: "vipPlanId", onDelete: "SET NULL" });
PostModel.belongsTo(VipPlanModel, { foreignKey: "vipPlanId" });

// 📄 POST ↔  CAR_MODEL
PostModel.hasOne(VehicleDetailModel, { as: "vehicleDetail", foreignKey: "postId", onDelete: "CASCADE" });
VehicleDetailModel.belongsTo(PostModel, { as: "post", foreignKey: "postId" });
// 📄 POST ↔  BATTERY_MODEL
PostModel.hasOne(BatteryDetailModel, { as: "batteryDetail", foreignKey: "postId", onDelete: "CASCADE" });
BatteryDetailModel.belongsTo(PostModel, { as: "post", foreignKey: "postId" });

// 👤 USER ↔ 💰 VIP PURCHASE (Giao dịch)
UserModel.hasMany(VipPurchaseModel, { foreignKey: "userId", onDelete: "CASCADE" });
VipPurchaseModel.belongsTo(UserModel, { foreignKey: "userId" });

// 💎 VIP PLAN ↔ 💰 VIP PURCHASE
// (Một gói VIP có thể có nhiều giao dịch)
VipPlanModel.hasMany(VipPurchaseModel, { foreignKey: "vipPlanId", onDelete: "SET NULL" });
VipPurchaseModel.belongsTo(VipPlanModel, { foreignKey: "vipPlanId" });

// 💰 VIP PURCHASE ↔ 📄 POST
// (Mỗi giao dịch thanh toán tương ứng với một bài đăng)
VipPurchaseModel.belongsTo(PostModel, { foreignKey: "postId", onDelete: "CASCADE" });
PostModel.hasOne(VipPurchaseModel, { foreignKey: "postId", onDelete: "CASCADE" });

// 📑 CONTRACT ↔ 👤 USER (buyer / seller / staff)
ContractModel.belongsTo(UserModel, { as: "buyer", foreignKey: "buyerId" });
ContractModel.belongsTo(UserModel, { as: "seller", foreignKey: "sellerId" });
ContractModel.belongsTo(UserModel, { as: "staff", foreignKey: "staffId" });

// Cho phép truy ngược từ user
UserModel.hasMany(ContractModel, { as: "contractsAsBuyer", foreignKey: "buyerId" });
UserModel.hasMany(ContractModel, { as: "contractsAsSeller", foreignKey: "sellerId" });
UserModel.hasMany(ContractModel, { as: "contractsAsStaff", foreignKey: "staffId" });
// 🆕 USER ↔ PURCHASE_REQUEST
UserModel.hasMany(PurchaseRequestModel, { as: "purchaseRequestsAsBuyer", foreignKey: "buyerId", onDelete: "CASCADE" });
UserModel.hasMany(PurchaseRequestModel, { as: "purchaseRequestsAsSeller", foreignKey: "sellerId", onDelete: "CASCADE" });
UserModel.hasMany(PurchaseRequestModel, { as: "handledRequests", foreignKey: "handledBy", onDelete: "SET NULL" });
PurchaseRequestModel.belongsTo(UserModel, { as: "buyer", foreignKey: "buyerId" });
PurchaseRequestModel.belongsTo(UserModel, { as: "seller", foreignKey: "sellerId" });
PurchaseRequestModel.belongsTo(UserModel, { as: "handler", foreignKey: "handledBy" });
// 🆕 POST ↔ PURCHASE_REQUEST
PostModel.hasMany(PurchaseRequestModel, { foreignKey: "postId", onDelete: "CASCADE" });
PurchaseRequestModel.belongsTo(PostModel, { foreignKey: "postId" });
// 🆕 CONTRACT ↔ PURCHASE_REQUEST
// Khi accept request sẽ tạo Contract và gắn requestId.
// Chọn SET NULL để nếu lỡ xóa request vẫn giữ được hợp đồng lịch sử.
PurchaseRequestModel.hasOne(ContractModel, { foreignKey: "requestId", onDelete: "SET NULL" });
ContractModel.belongsTo(PurchaseRequestModel, { foreignKey: "requestId" });
// 🆕 CONTRACT ↔ POST (tùy chọn – nếu có field postId trong Contract)
if (ContractModel.rawAttributes.postId) {
  ContractModel.belongsTo(PostModel, { foreignKey: "postId" });
  PostModel.hasMany(ContractModel, { foreignKey: "postId", onDelete: "CASCADE" });
}
// ===== Sync Database =====
export const connectDB = async () => {
  await sequelize.authenticate();
  const strategy = (process.env.SYNC_STRATEGY || "alter").toLowerCase();

  if (strategy === "force") {
    console.warn("⚠️ sequelize.sync({ force:true }) sẽ DROP toàn bộ bảng!");
    await sequelize.sync({ force: true });
  } else {
    await sequelize.sync({ alter: true });
  }

  console.log("✅ Database connected & synced successfully");
};

export const connection = connectDB;
