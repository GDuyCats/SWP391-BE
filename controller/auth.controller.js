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

const registerController = async (req, res) => {
  const { username, email, password } = req.body
  const existUser = await UserModel.findOne({ where: { email } })
  if (existUser != null) {
    return res.status(409).json("The user's email is already exist")
  } else {
    const hashedPass = await bcryptjs.hash(password, 10)
    const user = await UserModel.create({
      ...req.body,
      password: hashedPass
    })
    try {
      const token = generateVerifyEmailToken(user)
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
      console.error('Send verify email error:', e);
    }
    return res.status(201).json(user)
  }


}

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
        isVerified : user.isVerified
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
export { registerController, loginController, refreshTokenController, logoutController, profileController }