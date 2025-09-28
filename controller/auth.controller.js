import jswt from 'jsonwebtoken'
import { UserModel } from "../postgres/postgres.js"
import { generateAccessToken, generateRefreshToken, generateVerifyEmailToken } from "../utils/jswt.js";
import bcryptjs from "bcryptjs"
import dotenv from 'dotenv'
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs'
import Mail from '../utils/mailer.js'
dotenv.config()

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
    // 1) Check missing field
    const required = ['email', 'username', 'password'];
    const missing = required.filter(
      (k) => !req.body?.[k] || String(req.body[k]).trim() === ''
    );
    if (missing.length) {
      return res.status(400).json({
        message: `Missing required field(s): ${missing.join(', ')}`
      });
    }

    const { email, username, password } = req.body;

    // 1.5) Resend flow: nếu email đã có trong DB
    const existing = await UserModel.findOne({ where: { email } });
    if (existing) {
      if (existing.isVerified) {
        return res.status(409).json({ message: 'Email already exists' });
      }
      // Email đã tồn tại nhưng CHƯA verify -> gửi lại verify email
      try {
        const token = generateVerifyEmailToken(existing);
        const verifyUrl = `${process.env.API_BASE_URL}/auth/verify-email?token=${token}`;

        let html = fs.readFileSync(path.join(__dirname, '../mail.html'), 'utf-8');
        html = html.replace('[Email]', existing.email);
        html = html.replace('[VERIFY_URL]', verifyUrl);

        const mail = new Mail();
        mail.setTo(existing.email);
        mail.setSubject('Verify your email (resend)');
        mail.setHTML(html);
        await mail.send();
      } catch (error) {
        console.error('Resend verify email error:', error);
      }
      return res.status(200).json({ message: 'Verification email resent. Please check your inbox.' });
    }

    // 2) Hash password
    const hashedPass = await bcryptjs.hash(password, 10);

    // 3) Create user
    const user = await UserModel.create({
      ...req.body,
      password: hashedPass,
    });

    // 4) Send verify email (bắt lỗi riêng)
    try {
      const token = generateVerifyEmailToken(user);
      const verifyUrl = `${process.env.API_BASE_URL}/auth/verify-email?token=${token}`;

      let html = fs.readFileSync(path.join(__dirname, '../mail.html'), 'utf-8');
      html = html.replace('[Email]', user.email);
      html = html.replace('[VERIFY_URL]', verifyUrl);

      const mail = new Mail();
      mail.setTo(user.email);
      mail.setSubject('Verify your email');
      mail.setHTML(html);
      await mail.send();
    } catch (error) {
      console.error('Send verify email error:', error);
    }

    const { password: _pw, refreshToken: _rt, ...safeUser } = user.get({ plain: true });
    return res.status(201).json({
      message: 'Register success. Please verify your email.',
      user: safeUser
    });

  } catch (error) {
    console.error('Register error:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: error.errors[0].message });
    }

    return res.status(500).json({ message: 'Register failed' });
  }
};

const resendVerifyController = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || String(email).trim() === '') {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await UserModel.findOne({ where: { email } });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(404).json({ message: 'This email is already registered' });
    }

    // Rate limit 60s
    const left = secondsLeft(email);
    if (left > 0) {
      return res.status(429).json({
        message: `Please wait ${left}s before requesting another email.`,
        retryAfter: left
      });
    }

    const token = generateVerifyEmailToken(user);
    const verifyUrl = `${process.env.API_BASE_URL}/auth/verify-email?token=${token}`;

    let html = fs.readFileSync(path.join(__dirname, '../mail.html'), 'utf-8');
    html = html.replace('[Email]', user.email);
    html = html.replace('[VERIFY_URL]', verifyUrl);

    const mail = new Mail();
    mail.setTo(user.email);
    mail.setSubject('Verify your email (resend)');
    mail.setHTML(html);
    await mail.send();

    // cập nhật mốc thời gian đã gửi
    resendTracker.set(email, Date.now());

    return res.json({ message: 'Verification email resent. Please check your inbox.' });
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
    // res.clearCookie(refreshToken)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })

    return res.status(200).json({
      message: 'Login success',
      user: {
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        accessToken,
        isVerified: user.isVerified
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
    sameSite: 'strict',
    path: '/',
  });
  res.status(200).json({ message: "logout successfully" });
};

const profileController = async (req, res) => {
  return res.json('Profile')
}
export { registerController, resendVerifyController, loginController, refreshTokenController, logoutController, profileController }