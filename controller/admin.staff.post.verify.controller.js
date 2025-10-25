// controllers/post.verify.controller.js
import { PostModel, UserModel } from "../postgres/postgres.js";

const PUBLIC_POST_ATTRS = [
  "id",
  "title",
  "price",
  "category",
  "verifyStatus",
  "isActive",

  // VIP fields bắt buộc cho validator hiện tại
  "isVip",
  "vipPriority",
  "vipExpiresAt",
  "vipTier",

  "createdAt",
  "updatedAt",
];
/**
 * GET /admin/posts
 * - Admin: thấy tất cả
 * - Staff: chỉ thấy bài isActive = true
 */
const getAllPosts = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!["admin", "staff"].includes(role)) {
      return res.status(403).json({ message: "Bạn không có quyền xem toàn bộ bài đăng" });
    }

    const where = role === "staff" ? { isActive: true } : undefined;

    const posts = await PostModel.findAll({
      where,
      attributes: PUBLIC_POST_ATTRS,
      include: [{ model: UserModel, attributes: ["id", "username", "avatar", "email"] }],
      order: [["createdAt", "DESC"]],
    });

    if (!posts || posts.length === 0) {
      return res.status(404).json({ message: "Chưa có bài đăng nào" });
    }

    return res.json({ total: posts.length, data: posts });
  } catch (err) {
    console.error("getAllPosts error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * PATCH /posts/:id/verify
 * - Admin: duyệt tất cả
 * - Staff: chỉ duyệt bài isActive = true
 */
const verifyPost = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const { id } = req.params;
    const raw = String(req.body?.verifyStatus || "").trim().toLowerCase();

    if (!["admin", "staff"].includes(userRole)) {
      return res.status(403).json({ message: "Bạn không có quyền duyệt bài" });
    }
    if (!["verify", "nonverify"].includes(raw)) {
      return res.status(400).json({ message: "verifyStatus phải là 'verify' hoặc 'nonverify'" });
    }

    const post = await PostModel.findByPk(id, {
      attributes: PUBLIC_POST_ATTRS,
      include: [{ model: UserModel, attributes: ["id", "username", "avatar", "email"] }],
    });
    if (!post) return res.status(404).json({ message: "Không tìm thấy post" });

    // staff chỉ được duyệt bài đã kích hoạt
    if (userRole === "staff" && !post.isActive) {
      return res.status(403).json({ message: "Staff chỉ được duyệt bài đã kích hoạt (isActive = true)" });
    }

    post.verifyStatus = raw;
    await post.save({ fields: ["verifyStatus"] });

    return res.json({
      message: `Cập nhật verifyStatus bài #${id} thành '${raw}' thành công`,
      data: post,
    });
  } catch (err) {
    console.error("verifyPost error =>", err?.message, err?.errors || "", err?.stack);
    return res.status(500).json({ message: err?.message || "Internal Server Error" });
  }
};

/**
 * GET /posts/:id/detail
 * - Admin: xem tất cả
 * - Staff: chỉ xem bài có isActive = true
 */
const getPostDetail = async (req, res) => {
  try {
    const role = req.user?.role;
    const { id } = req.params;

    if (!["admin", "staff"].includes(role)) {
      return res.status(403).json({ message: "Bạn không có quyền xem chi tiết bài đăng" });
    }

    const post = await PostModel.findByPk(id, {
      attributes: PUBLIC_POST_ATTRS,
      include: [{ model: UserModel, attributes: ["id", "username", "avatar", "email"] }],
    });

    if (!post) return res.status(404).json({ message: "Không tìm thấy bài đăng" });

    if (role === "staff" && !post.isActive) {
      return res.status(403).json({ message: "Staff chỉ được xem bài có isActive = true" });
    }

    return res.json({ data: post });
  } catch (err) {
    console.error("getPostDetail error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export { getAllPosts, verifyPost, getPostDetail };
