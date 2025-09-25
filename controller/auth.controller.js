import jswt from 'jsonwebtoken'
import { UserModel } from "../postgres/postgres.js"
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import bcryptjs from "bcryptjs"
import dotenv from 'dotenv'
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

    // const { password: _pw, ...safeUser } = user.get({ plain: true }); tranfer thanh javascript

    const accessToken = await generateAccessToken(user)
    const refreshToken = await generateRefreshToken(user)
    user.update({ refreshToken })
    // res.clearCookie(refreshToken)
    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
    return res.status(200).json({
      message: 'Login success',
      user: {
        username: user.username,
        role: user.role,
        avatar: user.avatar,
        accessToken,
        refreshToken
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
    jswt.verify(refreshToken, process.env.JWT_SECRET_REFRESHTOKEN, async (error, decoded) => {

      if (error) {
        return res.status(403).json("Invalid Token !")
      }

      const token = generateAccessToken(user)
      console.log(user)
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
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "logout successfully" });
};


const profileController = async (req, res) => {
  return res.json('Profile')
}
export { registerController, loginController, refreshTokenController, logoutController, profileController }