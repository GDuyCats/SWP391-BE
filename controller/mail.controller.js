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
  // ✅ nhận thêm debug param
  const { token, redirect, debug } = req.query;
  if (!token) return res.status(400).send("Missing token");

  const baseDest = isSafeRedirect(redirect) ? redirect : getDefaultLoginUrl();

  try {
    // ✅ fallback secret (VERIFYEMAIL hoặc JWT_SECRET)
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET_VERIFYEMAIL || process.env.JWT_SECRET
    );

    const userId = payload?.id ?? payload?.userId;
    if (!userId) {
      const dest = withParam(baseDest, "verified", "0");
      if (debug === "1")
        return res.json({ ok: false, reason: "invalid_payload" });
      return res.redirect(303, withParam(dest, "reason", "invalid_payload"));
    }

    const user = await UserModel.findOne({ where: { id: userId } });
    if (!user) {
      const dest = withParam(baseDest, "verified", "0");
      if (debug === "1") return res.json({ ok: false, reason: "not_found" });
      return res.redirect(303, withParam(dest, "reason", "not_found"));
    }

    if (user.isVerified) {
      const dest = withParam(baseDest, "verified", "1");
      if (debug === "1")
        return res.json({ ok: true, reason: "already_verified" });
      return res.redirect(303, withParam(dest, "reason", "already_verified"));
    }

    await user.update({ isVerified: true, verifiedAt: new Date() });
    const dest = withParam(baseDest, "verified", "1");
    if (debug === "1") return res.json({ ok: true, reason: "just_verified" });
    return res.redirect(303, withParam(dest, "reason", "just_verified"));
  } catch (err) {
    const dest = withParam(baseDest, "verified", "0");
    const reason =
      err?.name === "TokenExpiredError" ? "expired" : "invalid_token";
    // ✅ debug hiển thị lý do lỗi
    if (debug === "1")
      return res.json({ ok: false, reason, error: err.message });
    return res.redirect(303, withParam(dest, "reason", reason));
  }
};

export { verifyMailController };
