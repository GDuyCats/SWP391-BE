import { UserModel, VipPurchaseModel } from "../postgres/postgres.js";
import { Op } from "sequelize";

/**
 * Get current user's profile
 */
const profileController = async (req, res) => {
  try {
    const userId = req.user?.id; // checkToken gắn vào
    if (!userId) {
      return res.status(401).json({ message: "Missing auth payload" });
    }

    const user = await UserModel.findByPk(userId, {
      // CHỈ chọn các trường public cần trả về
      attributes: [
        "id",
        "username",
        "phone",
        "email",
        "avatar",
        "role",
        "isVerified",
        // "isVip",
        // "vipExpiresAt",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Không cache dữ liệu nhạy cảm
    res.set("Cache-Control", "no-store");
    return res.status(200).json({ user });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", detail: err.message });
  }
};

/**
 * Update current user's profile
 */
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id; // đã có từ checkToken
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Chỉ whitelist các field được phép cập nhật
    let { username, phone, avatar } = req.body;

    // Chuẩn hoá dữ liệu đầu vào (trim)
    if (typeof username === "string") username = username.trim();
    if (typeof phone === "string") phone = phone.trim();
    if (typeof avatar === "string") avatar = avatar.trim();

    // Cho phép xoá phone: nếu gửi "" thì set null
    if (phone === "") phone = null;
    if (avatar === "") avatar = null;

    const patch = {};
    if (typeof username === "string" && username.length > 0)
      patch.username = username;
    if (phone === null || typeof phone === "string") patch.phone = phone; // null hoặc string hợp lệ
    if (avatar === null || typeof avatar === "string") patch.avatar = avatar;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Kiểm tra tồn tại
    const user = await UserModel.findByPk(userId); // defaultScope đang ẩn field nhạy cảm — OK
    if (!user) return res.status(404).json({ message: "User not found" });

    // Nếu update phone -> đảm bảo không trùng người khác
    if (patch.phone) {
      const existing = await UserModel.findOne({ where: { phone: patch.phone } });
      if (existing && existing.id !== userId) {
        return res.status(409).json({ message: "Phone is already in use" });
      }
    }

    // Thực hiện cập nhật (Sequelize sẽ chạy validate regex phone của bạn)
    await user.update(patch);

    res.set("Cache-Control", "no-store");
    return res.status(200).json({ user }); // đã được defaultScope & toJSON ẩn nhạy cảm
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
      });
    }
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        message: "Duplicate value",
        errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
      });
    }
    return res
      .status(500)
      .json({ message: "Internal server error", detail: err.message });
  }
};

/**
 * Get user's VIP purchase history
 */
const getMyPurchases = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ ok: false, message: "Unauthorized" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const where = { userId };
    if (req.query.status) where.status = req.query.status;
    if (req.query.provider) where.provider = req.query.provider;
    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt[Op.gte] = new Date(req.query.from);
      if (req.query.to) where.createdAt[Op.lte] = new Date(req.query.to);
    }

    const { rows, count } = await VipPurchaseModel.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      attributes: [
        "id",
        "orderCode",
        "amount",
        "status",
        "provider",
        "createdAt",
        "updatedAt",
      ],
    });

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      page,
      limit,
      total: count,
      items: rows,
    });
  } catch (err) {
    console.error("[getMyPurchases] error:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Failed to fetch purchases" });
  }
};

export { profileController, updateMyProfile, getMyPurchases };
