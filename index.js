// app.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";
import Mail from "./utils/mailer.js";
// ⛳ ĐÃ SỬA: import thêm sequelize để dùng ở /__dbcheck
import { connectDB, sequelize } from "./postgres/postgres.js";

import admin_routes from "./routes/admin.routes.js";
import auth_routes from "./routes/auth.routes.js";
import mail_routes from "./routes/mail.routes.js";
import user_routes from "./routes/user.routes.js";

dotenv.config();

const app = express();

// ⛳ ĐÃ SỬA: proxy awareness cho Railway/Heroku
app.set("trust proxy", 1);

// Body & cookies
app.use(cookieParser());
app.use(express.json());

// ⛳ ĐÃ SỬA: CORS với whitelist (nhiều origin, gồm local)
const whitelist = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Cho phép tools như Postman (origin null)
    if (!origin) return cb(null, true);
    if (whitelist.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// ⛳ ĐÃ SỬA: preflight
app.options(/.*/, cors(corsOptions)); 
// Routes
app.use(admin_routes);
app.use(auth_routes);
app.use(mail_routes);
app.use(user_routes);

// Health & DB check
app.get("/healthz", (req, res) => res.status(200).send("ok"));
app.get("/__mailcheck", async (req, res) => {
  try {
    const to = req.query.to || process.env.TEST_TO || "<your email>";
    const mail = new Mail()
      .setTo(to)
      .setSubject("Resend OK")
      .setHTML("<b>Your server can send emails ✅ via Resend</b>");
    const info = await mail.send();
    res.json({ ok: true, id: info?.id });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});
app.get("/__dbcheck", async (req, res) => {
  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query("SELECT 1 AS ok");
    res.json({ ok: true, rows });
  } catch (e) {
    console.error("❌ __dbcheck:", e);
    res.status(500).json({
      ok: false,
      message: e.message,
      ...(process.env.NODE_ENV !== "production" ? { stack: e.stack } : {}),
    });
  }
});

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start server
const start = async () => {
  try {
    // ⛳ ĐÃ SỬA: chờ DB xong
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
