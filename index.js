// app.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";

import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./utils/uploadthing.js";
import { swaggerSpec } from "./docs/swagger.js";
import { stripeWebhook } from "./controller/stripe.controller.js";
import { connectDB } from "./postgres/postgres.js";

import admin_routes from "./routes/admin.routes.js";
import admin_vipplans_routes from "./routes/admin.vipPlan.route.js";
import auth_routes from "./routes/auth.routes.js";
import mail_routes from "./routes/mail.routes.js";
import user_routes from "./routes/user.routes.js";
import user_post_routes from "./routes/user.post.routes.js";
import post_public_router from "./routes/post.public.router.js";
import post_verify_routes from "./routes/post.verify.routes.js";
import billing_routes from "./routes/billing.route.js";
import contract_routes from "./routes/contract.routes.js";
import contract_admin_routes from "./routes/contract.admin.routes.js";
import contract_staff_routes from "./routes/contract.staff.routes.js";
import contract_viewer_routes from "./routes/contract.viewer.routes.js"
import contract_otp_routes from "./routes/contract.otp.routes.js";
import verify_routes from "./routes/mail.routes.js"
import purchase_request_routes from "./routes/purchaseRequest.routes.js";
dotenv.config();

const app = express();

// --- Trust proxy (Railway/Heroku) ---
app.set("trust proxy", 1);

// --- Stripe webhook MUST come BEFORE any body parsers ---
app.post(
  "/billing/vip/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// --- Body & cookies for the rest of routes ---
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
    // không cần truyền token ở đây, SDK tự đọc từ process.env.UPLOADTHING_TOKEN
  })
);

// --- CORS with whitelist (multi-origins) ---
const DEFAULT_ORIGINS = [
  "http://localhost:5173", // Vite FE
  "http://localhost:8081", // Swagger (served by BE)
  "http://127.0.0.1:8081", // sometimes Swagger shows this
];

// FRONTEND_URL can be comma-separated (e.g. "http://localhost:5173,https://your-app.up.railway.app")
const whitelist = (
  process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((s) => s.trim())
    : DEFAULT_ORIGINS
).filter(Boolean);

console.log("[CORS] whitelist =", whitelist);

const corsOptions = {
  origin(origin, cb) {
    // Allow tools like Postman/curl (no Origin header)
    if (!origin) return cb(null, true);
    if (whitelist.includes(origin)) return cb(null, true);
    // also try localhost <-> 127.0.0.1 swap
    const alt =
      origin.includes("localhost")
        ? origin.replace("localhost", "127.0.0.1")
        : origin.includes("127.0.0.1")
        ? origin.replace("127.0.0.1", "localhost")
        : origin;
    if (whitelist.includes(alt)) return cb(null, true);

    return cb(new Error("Not allowed by CORS: " + origin), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// Preflight
app.options(/.*/, cors(corsOptions));

// --- Routes ---


app.use(auth_routes);
app.use(mail_routes);
app.use(verify_routes);
app.use("/admin", admin_routes);
app.use("/admin", admin_vipplans_routes);
app.use("/profile", user_routes);
app.use(user_post_routes);
app.use(post_public_router);
app.use(post_verify_routes);
app.use("/plans",billing_routes);
app.use("/contracts", contract_routes)
app.use("/admin/contracts", contract_admin_routes);
app.use("/staff/contracts", contract_staff_routes);
app.use("/me", contract_viewer_routes)
app.use("/", contract_otp_routes);
app.use("/PurchaseRequests", purchase_request_routes);
// --- Swagger ---
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// (Optional) CORS error to JSON instead of 500 HTML
// put after routes so it only catches CORS errors coming from middleware
app.use((err, req, res, next) => {
  if (err?.message?.startsWith("Not allowed by CORS")) {
    return res.status(403).json({ ok: false, error: err.message });
  }
  return next(err);
});

// --- Start server ---
const start = async () => {
  try {
    await connectDB();
    const PORT = Number(process.env.BE_PORT) || 8081;
    const HOST = "0.0.0.0";
    app.listen(PORT, HOST, () => {
      const base = process.env.API_BASE_URL || `http://localhost:${PORT}`;
      console.log(`Server is running at ${base}`);
      console.log(`Swagger docs at ${base}/api-docs`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();

export default app;
