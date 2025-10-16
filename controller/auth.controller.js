import jswt from 'jsonwebtoken'
import { UserModel } from "../postgres/postgres.js"
import { generateAccessToken, generateRefreshToken, generateVerifyEmailToken } from "../utils/jswt.js";
import bcryptjs from "bcryptjs"
import dotenv from 'dotenv'

/* ⬇️ ĐÃ SỬA: move import lên trước rồi mới dùng __dirname (tránh lỗi đường dẫn ESM) */
import path, { dirname } from 'path';              // ĐÃ SỬA
import { fileURLToPath } from 'url';               // ĐÃ SỬA
import fs from 'fs'
import Mail from '../utils/mailer.js'

const __filename = fileURLToPath(import.meta.url); // ĐÃ SỬA
const __dirname = dirname(__filename);             // ĐÃ SỬA

const MAIL_TPL_PATH = path.join(__dirname, "../mail.html");

const MAIL_TPL = fs.readFileSync(MAIL_TPL_PATH, "utf-8");

function renderVerifyEmailHTML({ verifyUrl, email }) {
  return MAIL_TPL
    .replaceAll("[VERIFY_URL]", verifyUrl)
    .replaceAll("[Email]", email ?? "");
}
dotenv.config()
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const COOLDOWN_MS = 60_000;
const resendTracker = new Map()
function secondsLeft(email) {
  const last = resendTracker.get(email);
  if (!last) return 0;
  const left = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
  return left > 0 ? left : 0;
}

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

    // Helper nhỏ để build verifyUrl có redirect về FE login
    const getApiBase = () =>
      process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const getDefaultRedirect = () =>
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/login?verified=1`;
    const buildVerifyUrl = (token, redirectOverride) => {
      const base = getApiBase();
      const redirect = redirectOverride || getDefaultRedirect();
      return `${base}/auth/verify-email?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirect)}`;
    };

    // 1.5) Nếu email đã tồn tại
    const existing = await UserModel.findOne({ where: { email } });
    if (existing) {
      if (existing.isVerified) {
        return res.status(409).json({ message: "Email already exists" });
      }
      try {
        const token = generateVerifyEmailToken(existing);
        const verifyUrl = buildVerifyUrl(token); // ⬅️ đã kèm redirect

        // dùng template
        const html = renderVerifyEmailHTML({ verifyUrl, email: existing.email });

        const mail = new Mail();
        mail.setTo(existing.email);
        mail.setSubject("Verify your email (resend)");
        mail.setHTML(html);
        if (mail.setText) mail.setText(`Verify your email: ${verifyUrl}`);
        await mail.send();
      } catch (error) {
        console.error("Resend verify email error:", {
          message: error.message, code: error.code, command: error.command,
          response: error.response, stack: error.stack,
        });
      }
      return res
        .status(200)
        .json({ message: "Verification email resent. Please check your inbox." });
    }

    // 1.6) Nếu username đã tồn tại ➜ trả message theo yêu cầu
    const existingUsername = await UserModel.findOne({ where: { username } });
    if (existingUsername) {
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
      const verifyUrl = buildVerifyUrl(token); // ⬅️ đã kèm redirect

      const html = renderVerifyEmailHTML({ verifyUrl, email: user.email });

      const mail = new Mail();
      mail.setTo(user.email);
      mail.setSubject("Verify your email");
      mail.setHTML(html);
      if (mail.setText) mail.setText(`Verify your email: ${verifyUrl}`);
      await mail.send();
    } catch (error) {
      console.error("Send verify email error:", {
        message: error.message, code: error.code, command: error.command,
        response: error.response, stack: error.stack,
      });
    }

    // 5) Response
    const { password: _pw, refreshToken: _rt, ...safeUser } = user.get({ plain: true });
    const expose = process.env.NODE_ENV !== "production" || process.env.EXPOSE_VERIFY_LINK === "true";
    return res.status(201).json({
      message: "Register success. Please verify your email.",
      ...(expose ? {
        // ⬇️ Link debug cũng kèm redirect như trong email
        verifyUrl: buildVerifyUrl(generateVerifyEmailToken(user))
      } : {}),
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
    const user = await UserModel.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) {
      return res.status(409).json({ message: 'This email is already registered' });
    }

    // 3) Rate limit 60s
    const left = secondsLeft(email); // <- đảm bảo helper tồn tại
    if (left > 0) {
      res.set('Retry-After', String(left));
      return res.status(429).json({
        message: `Please wait ${left}s before requesting another email.`,
        retryAfter: left,
      });
    }

    // 4) Verify env cho gửi mail
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ message: 'Missing RESEND_API_KEY' });
    }
    if (!MAIL_FROM || !/@/.test(MAIL_FROM)) {
      return res.status(500).json({ message: 'MAIL_FROM is not set or invalid' });
    }

    // 5) Tạo verify URL (absolute)
    const token = generateVerifyEmailToken(user); // <- đảm bảo không throw vì thiếu secret
    const base =
      process.env.API_BASE_URL ||
      `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${base}/auth/verify-email?token=${token}`;

    // 6) Render HTML
    const html = renderVerifyEmailHTML({ verifyUrl, email: user.email });

    // 7) Gửi email qua Resend SDK
    try {
      const result = await resend.emails.send({
        from: MAIL_FROM,                 // BẮT BUỘC: domain đã verify trên Resend
        to: user.email,
        subject: 'Verify your email (resend)',
        html,
        text: `Verify your email: ${verifyUrl}`,
      });
      // Optional: kiểm tra result.error
      if (result?.error) {
        console.error('Resend send error:', result.error);
        return res.status(502).json({ message: 'Email provider failed', detail: result.error });
      }
    } catch (e) {
      console.error('RESEND ERROR:', e?.statusCode, e?.message, e?.name, e?.response?.body || e);
      return res.status(502).json({
        message: 'Email provider failed',
        detail: e?.response?.body || e?.message || 'Unknown email error',
      });
    }

    // 8) Cập nhật rate-limit & response
    resendTracker.set(email, Date.now());
    const expose =
      process.env.NODE_ENV !== 'production' ||
      process.env.EXPOSE_VERIFY_LINK === 'true';

    return res.json({
      message: 'Verification email resent. Please check your inbox.',
      ...(expose ? { verifyUrl } : {}),
    });
  } catch (error) {
    console.error('Resend verify error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack,
    });
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

    /* ⬇️ ĐÃ SỬA: cookie cross-site chuẩn prod */
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',                        // ĐÃ SỬA
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',     // ĐÃ SỬA
      path: '/',
    })

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
    secure: process.env.NODE_ENV === 'production',                        // ĐÃ SỬA
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',     // ĐÃ SỬA
    path: '/',
  });
  res.status(200).json({ message: "logout successfully" });
};

export { registerController, resendVerifyController, loginController, refreshTokenController, logoutController }
