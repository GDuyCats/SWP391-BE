import jswt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()
import {UserModel} from '../postgres/postgres.js' // <- thêm

const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion, // accessToken chứa version hiện tại
  };
  return jswt.sign(payload, process.env.JWT_SECRET_ACCESSTOKEN, { expiresIn: '10m' });
}

const generateRefreshToken = async (user) => {
  // giữ nguyên logic refresh như bạn đang dùng
  const token = jswt.sign(
    { username: user.username },
    process.env.JWT_SECRET_REFRESHTOKEN,
    { expiresIn: "15d" }
  );
  return token
}

const authenticateToken = (req, res, next) => {
  try {
    const auth = req.headers["authorization"] || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    jswt.verify(token, process.env.JWT_SECRET_ACCESSTOKEN, async (err, decoded) => {
      if (err) {
        const message = err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
        return res.status(401).json({ message });
      }

      // --- chỉ thêm kiểm tra tokenVersion ---
      const userId = decoded?.id;
      if (!userId) {
        return res.status(401).json({ message: "Invalid token payload" });
      }

      const user = await UserModel.findOne({ where: { id: userId } });
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // so sánh version: khác => token cũ đã bị revoke do logout
      const vToken = Number(decoded?.tokenVersion);
      const vDb = Number(user.tokenVersion);
      if (!Number.isNaN(vToken) && !Number.isNaN(vDb) && vToken !== vDb) {
        return res.status(401).json({ message: "Token revoked" });
      }
      // --- hết phần thêm ---

      req.user = decoded;
      return next();
    });
  } catch (e) {
    return res.status(500).json({ message: "Auth middleware error" });
  }
};

export {
  generateAccessToken, generateRefreshToken, authenticateToken
}
