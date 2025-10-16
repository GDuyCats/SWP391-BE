import jwt from "jsonwebtoken";
import { UserModel } from "../postgres/postgres.js";

const norm = (s) => String(s || "").split(",")[0].trim();
const CLIENT_URL = norm(process.env.CLIENT_URL || "http://localhost:5173");

const getDefaultLoginUrl = () => `${CLIENT_URL}/login`;

// reject multiple hosts & only allow http/https
const isSafeRedirect = (url) => {
  if (!url || typeof url !== "string") return false;
  if (url.includes(",")) return false; // chặn list
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// thêm/ghi đè query param
const withParam = (url, key, value) => {
  const u = new URL(url);
  u.searchParams.set(key, value);
  return u.toString();
};

const verifyMailController = async (req, res) => {
  const { token, redirect } = req.query;
  if (!token) return res.status(400).send("Missing token");

  // Base dest
  const baseDest = isSafeRedirect(redirect) ? redirect : getDefaultLoginUrl();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET_VERIFYEMAIL);
    const userId = payload?.id ?? payload?.userId;
    if (!userId) {
      const dest = withParam(baseDest, "verified", "0");
      return res.redirect(303, withParam(dest, "reason", "invalid_payload"));
    }

    const user = await UserModel.findOne({ where: { id: userId } });
    if (!user) {
      const dest = withParam(baseDest, "verified", "0");
      return res.redirect(303, withParam(dest, "reason", "not_found"));
    }

    if (user.isVerified) {
      // đã verify từ trước
      const dest = withParam(baseDest, "verified", "1");
      return res.redirect(303, withParam(dest, "reason", "already_verified"));
    }

    await user.update({ isVerified: true, verifiedAt: new Date() });
    // verify thành công lần đầu
    const dest = withParam(baseDest, "verified", "1");
    return res.redirect(303, withParam(dest, "reason", "just_verified"));
  } catch (err) {
    // Token lỗi/hết hạn
    const dest = withParam(baseDest, "verified", "0");
    const reason =
      err?.name === "TokenExpiredError" ? "expired" : "invalid_token";
    return res.redirect(303, withParam(dest, "reason", reason));
  }
};

export { verifyMailController };
