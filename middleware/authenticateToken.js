import { UserModel } from '../postgres/postgres.js'
import jswt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

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

      const userId = decoded?.id;
      if (!userId) {
        return res.status(401).json({ message: "Invalid token payload" });
      }

      const user = await UserModel.findOne({ where: { id: userId } });
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const vToken = Number(decoded?.tokenVersion);
      const vDb = Number(user.tokenVersion);
      if (!Number.isNaN(vToken) && !Number.isNaN(vDb) && vToken !== vDb) {
        return res.status(401).json({ message: "Token revoked" });
      }

      req.user = decoded;
      return next();
    });
  } catch (e) {
    return res.status(500).json({ message: "Auth middleware error" });
  }
};

export default authenticateToken