import jswt from 'jsonwebtoken'
import { UserModel } from "../postgres/postgres.js"
import { generateAccessToken, generateRefreshToken, generateVerifyEmailToken } from "../utils/jswt.js";
import bcryptjs from "bcryptjs"
import dotenv from 'dotenv'
import { Op } from "sequelize";
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs'
import Mail from '../utils/mailer.js'

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MAIL_TPL_PATH = path.join(__dirname, "../mail.html");
const MAIL_TPL = fs.readFileSync(MAIL_TPL_PATH, "utf-8");

function renderVerifyEmailHTML({ verifyUrl, email }) {
  return MAIL_TPL
    .replaceAll("[VERIFY_URL]", verifyUrl)
    .replaceAll("[Email]", email ?? "");
}

const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:5173").trim();

const COOLDOWN_MS = 60_000;
const resendTracker = new Map();
function secondsLeft(email) {
  const last = resendTracker.get(email);
  if (!last) return 0;
  const left = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
  return left > 0 ? left : 0;
}

/* Helpers URL */
const getApiBase = (req) =>
  process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;

// Nếu .env lỡ chứa nhiều URL ngăn cách dấu phẩy → chỉ lấy cái đầu
const normalizeSingleUrl = (s) => String(s || "").split(",")[0].trim();

const getDefaultRedirect = () =>
  `${normalizeSingleUrl(CLIENT_URL)}/login?verified=1`;

const buildVerifyUrl = (req, token, redirectOverride) => {
  const base = getApiBase(req);
  const redirect = normalizeSingleUrl(redirectOverride || getDefaultRedirect());
  return `${base}/auth/verify-email?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}`;
};

/* ============= Controllers ============= */

const registerController = async (req, res) => {
  try {
    // 1) Validate các field bắt buộc
    const required = ["email", "username", "password"];
    const missing = required.filter(
      (k) => !req.body?.[k] || String(req.body[k]).trim() === ""
    );
    if (missing.length) {
      return res.status(400).json({
        message: `Missing required field(s): ${missing.join(", ")}`,
      });
    }

    // 1.1) Chuẩn hoá + kiểm tra định dạng email
    const email = String(req.body.email).trim().toLowerCase();
    const username = String(req.body.username).trim();
    const password = String(req.body.password);
    const emailRe = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
    if (!emailRe.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // 1.5) Nếu email HOẶC username đã tồn tại (phân loại chính xác)
    const collisions = await UserModel.findAll({
      where: { [Op.or]: [{ email }, { username }] },
      attributes: ["id", "email", "username", "isVerified"],
      limit: 2,
    });

    const emailUser = collisions.find(u => u.email === email);
    const usernameUser = collisions.find(u => u.username === username);

    if (emailUser) {
      if (emailUser.isVerified) {
        return res.status(409).json({ message: "Email already exists" });
      }
      // Email chưa verify -> resend mail verify
      try {
        const token = generateVerifyEmailToken(emailUser);
        const verifyUrl = buildVerifyUrl(req, token);
        const html = renderVerifyEmailHTML({ verifyUrl, email: emailUser.email });

        const mail = new Mail();
        mail.setTo(emailUser.email);
        mail.setSubject("Verify your email (resend)");
        mail.setHTML(html);
        if (mail.setText) mail.setText(`Verify your email: ${verifyUrl}`);
        await mail.send();
      } catch (error) {
        console.error("Resend verify email error:", {
          message: error.message,
          code: error.code,
          command: error.command,
          response: error.response,
          stack: error.stack,
        });
      }
      return res
        .status(200)
        .json({ message: "Verification email resent. Please check your inbox." });
    }

    if (usernameUser) {
      return res.status(409).json({ message: "username have been existed" });
    }

    // 2) Hash password
    const hashedPass = await bcryptjs.hash(password, 10);

    // 3) Tạo user
    const user = await UserModel.create({
      email,
      username,
      password: hashedPass,
      isVerified: false,
    });

    // 4) Gửi verify email
    try {
      const token = generateVerifyEmailToken(user);
      const verifyUrl = buildVerifyUrl(req, token);

      const html = renderVerifyEmailHTML({ verifyUrl, email: user.email });

      const mail = new Mail();
      mail.setTo(user.email);
      mail.setSubject("Verify your email");
      mail.setHTML(html);
      if (mail.setText) mail.setText(`Verify your email: ${verifyUrl}`);
      await mail.send();
    } catch (error) {
      console.error("Send verify email error:", {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        stack: error.stack,
      });
    }

    // 5) Response
    const { password: _pw, refreshToken: _rt, ...safeUser } = user.get({ plain: true });
    const expose =
      process.env.NODE_ENV !== "production" ||
      process.env.EXPOSE_VERIFY_LINK === "true";

    return res.status(201).json({
      message: "Register success. Please verify your email.",
      ...(expose ? { verifyUrl: buildVerifyUrl(req, generateVerifyEmailToken(user)) } : {}),
      user: safeUser,
    });
  } catch (error) {
    console.error("Register error:", error);

    // Phân biệt lỗi unique cho email/username ở DB
    if (error.name === "SequelizeUniqueConstraintError") {
      const firstErr = error?.errors?.[0];
      const fieldFromErr = firstErr?.path;
      const fieldFromMap = Object.keys(error?.fields || {})[0];
      const field = fieldFromErr || fieldFromMap;

      if (field === "username") {
        return res.status(409).json({ message: "username have been existed" });
      }
      if (field === "email") {
        return res.status(409).json({ message: "Email already exists" });
      }
      return res.status(409).json({ message: "Duplicate value" });
    }

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({ message: error.errors[0].message });
    }
    return res.status(500).json({ message: "Register failed" });
  }
};

const resendVerifyController = async (req, res) => {
  try {
    // 1) Validate email
    const raw = req.body?.email;
    const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    const emailRe = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
    if (!email || !emailRe.test(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    // 2) Tìm user
    const user = await UserModel.findOne({
      where: { email },
      attributes: ["id", "email", "isVerified"]
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) {
      return res.status(409).json({ message: 'This email is already registered' });
    }

    // 3) Rate limit 60s
    const left = secondsLeft(email);
    if (left > 0) {
      res.set('Retry-After', String(left));
      return res.status(429).json({
        message: `Please wait ${left}s before requesting another email.`,
        retryAfter: left,
      });
    }

    // 4) Tạo verify URL + gửi mail (dùng Mail class như register)
    const token = generateVerifyEmailToken(user);
    const verifyUrl = buildVerifyUrl(req, token);
    const html = renderVerifyEmailHTML({ verifyUrl, email: user.email });

    try {
      const mail = new Mail();
      mail.setTo(user.email);
      mail.setSubject("Verify your email (resend)");
      mail.setHTML(html);
      if (mail.setText) mail.setText(`Verify your email: ${verifyUrl}`);
      await mail.send();
    } catch (e) {
      console.error('Email send error:', e);
      return res.status(502).json({ message: 'Email provider failed' });
    }

    // 5) Cập nhật rate-limit & response
    resendTracker.set(email, Date.now());
    const expose =
      process.env.NODE_ENV !== 'production' ||
      process.env.EXPOSE_VERIFY_LINK === 'true';

    return res.json({
      message: 'Verification email resent. Please check your inbox.',
      ...(expose ? { verifyUrl } : {}),
    });
  } catch (error) {
    console.error('Resend verify error:', error);
    return res.status(500).json({ message: 'Resend failed' });
  }
};

const loginController = async (req, res) => {
  const { username, password } = req.body || {};
  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    const user = await UserModel.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isValid = await bcryptjs.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in' });
    }

    const accessToken = generateAccessToken(user)
    const refreshToken = await generateRefreshToken(user)
    await user.update({ refreshToken });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      path: '/',
    });

    return res.status(200).json({
      message: 'Login success',
      user: {
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        accessToken,
        isVerified: user.isVerified,
        isVip: user.isVip,
        vipExpiresAt: user.vipExpiresAt
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

const refreshTokenController = async (req, res) => {
  const refreshToken = req.cookies.refreshToken
  try {
    if (!refreshToken) {
      return res.status(403).json("Token is empty")
    }

    const user = await UserModel.findOne({ where: { refreshToken } })
    if (!user) {
      return res.status(403).json("Invalid Token !");
    }

    jswt.verify(
      refreshToken,
      process.env.JWT_SECRET_REFRESHTOKEN,
      async (error, decoded) => {

        if (error) {
          return res.status(403).json("Invalid Token !")
        }

        if (!decoded?.id || decoded.id !== user.id) {
          return res.status(403).json("Invalid Token !");
        }
        if (typeof decoded.tokenVersion !== 'number' || decoded.tokenVersion !== user.tokenVersion) {
          return res.status(403).json("Token has been revoked");
        }

        const token = generateAccessToken(user)
        return res.status(200).json({ accessToken: token })
      })

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
  console.log(refreshToken)
}

const logoutController = async (req, res) => {
  const rt = req.cookies?.refreshToken;
  if (rt) {
    const user = await UserModel.findOne({ where: { refreshToken: rt } });
    if (user) {
      await user.update({ refreshToken: null });
      await user.increment("tokenVersion");
    }
  }

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    path: '/',
  });
  res.status(200).json({ message: "logout successfully" });
};

export {
  registerController,
  resendVerifyController,
  loginController,
  refreshTokenController,
  logoutController
}
