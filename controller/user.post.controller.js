// controller/user.post.controller.js
import { UserModel, PostModel, VipPlanModel } from "../postgres/postgres.js";

const PHONE_REGEX = /^(?:\+84|0)(?:\d{9,10})$/;

// === Helper ===
function normalizeImages(input) {
  if (!input) return [];
  if (typeof input === "string") {
    try {
      const maybe = JSON.parse(input);
      return Array.isArray(maybe)
        ? maybe.map(String)
        : input.trim()
        ? [input.trim()]
        : [];
    } catch {
      return input.trim() ? [input.trim()] : [];
    }
  }
  return Array.isArray(input) ? input.map(String) : [];
}

// ======================================================
// CREATE POST (chỉ tạo; CHƯA hiển thị, CHƯA VIP)
// ======================================================
export const createMyPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const {
      title,
      content,
      thumbnail,
      image,
      price,
      phone,
      category,
      vipPlanId, // (tuỳ chọn) nếu FE chọn sẵn, chỉ lưu tạm
    } = req.body ?? {};

    if (!title?.trim()) return res.status(400).json({ message: "title là bắt buộc" });
    if (!content?.trim()) return res.status(400).json({ message: "content là bắt buộc" });

    const images = normalizeImages(image);
    const priceNum = Number(price ?? 0);
    if (Number.isNaN(priceNum) || priceNum < 0)
      return res.status(400).json({ message: "price phải là số >= 0" });

    if (phone && !PHONE_REGEX.test(String(phone)))
      return res.status(400).json({ message: "Số điện thoại không hợp lệ (VN)" });

    // Nếu FE gửi vipPlanId khi tạo: kiểm tra hợp lệ rồi LƯU TẠM,
    // KHÔNG bật VIP cho đến khi thanh toán xong.
    let planIdToSave = null;
    if (vipPlanId != null) {
      const plan = await VipPlanModel.findOne({ where: { id: vipPlanId, active: true } });
      if (!plan) return res.status(404).json({ message: "Gói VIP không tồn tại hoặc đã bị tắt" });
      planIdToSave = plan.id;
    }

    const post = await PostModel.create({
      userId,
      title: title.trim(),
      content: content.trim(),
      thumbnail: thumbnail ? String(thumbnail).trim() : null,
      image: images,
      price: priceNum,
      phone: phone ? String(phone).trim() : null,
      category: ["battery", "vehicle"].includes(category) ? category : "vehicle",

      // ❗ Mặc định: chưa hiển thị & chưa VIP
      isActive: false,
      isVip: false,
      vipPlanId: planIdToSave,
      vipTier: null,
      vipPriority: 0,
      vipExpiresAt: null,
      verifyStatus: "nonverify",
    });

    return res
      .status(201)
      .json({ message: "Tạo bài thành công (chưa hiển thị). Vui lòng chọn gói & thanh toán để hiển thị.", data: post });
  } catch (err) {
    console.error("createMyPost error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================================================
// UPDATE POST (user chỉ được sửa nội dung, KHÔNG được bật VIP/hiển thị)
// ======================================================
export const updateMyPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const post = await PostModel.findByPk(id);
    if (!post) return res.status(404).json({ message: "Không tìm thấy post" });
    if (post.userId !== userId)
      return res.status(403).json({ message: "Bạn không có quyền sửa post này" });

    const {
      title,
      content,
      thumbnail,
      image,
      price,
      phone,
      category,
      verifyStatus, // chỉ staff/admin được đổi (bên dưới kiểm tra)
      // ⚠️ Nếu FE gửi các trường sau, ta phớt lờ để user không tự ý bật:
      isActive,
      isVip,
      vipPlanId,
      vipTier,
      vipPriority,
      vipExpiresAt,
    } = req.body ?? {};

    // Bảo vệ: nếu user cố gửi các trường VIP/hiển thị, bỏ qua
    if (
      isActive !== undefined ||
      isVip !== undefined ||
      vipPlanId !== undefined ||
      vipTier !== undefined ||
      vipPriority !== undefined ||
      vipExpiresAt !== undefined
    ) {
      // Không làm gì: phần này chỉ cho webhook hoặc staff route riêng
    }

    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: "title không được rỗng" });
      post.title = String(title).trim();
    }
    if (content !== undefined) {
      if (!String(content).trim()) return res.status(400).json({ message: "content không được rỗng" });
      post.content = String(content).trim();
    }
    if (thumbnail !== undefined) post.thumbnail = thumbnail ? String(thumbnail).trim() : null;
    if (image !== undefined) post.image = normalizeImages(image);
    if (price !== undefined) {
      const n = Number(price);
      if (Number.isNaN(n) || n < 0) return res.status(400).json({ message: "price phải là số >= 0" });
      post.price = n;
    }
    if (phone !== undefined) {
      if (phone && !PHONE_REGEX.test(String(phone)))
        return res.status(400).json({ message: "Số điện thoại không hợp lệ (VN)" });
      post.phone = phone ? String(phone) : null;
    }
    if (category !== undefined) {
      if (!["battery", "vehicle"].includes(category))
        return res.status(400).json({ message: "category phải là 'battery' hoặc 'vehicle'" });
      post.category = category;
    }

    // ✅ Chỉ admin/staff mới được duyệt
    if (verifyStatus !== undefined) {
      const role = req.user?.role;
      if (role !== "admin" && role !== "staff")
        return res.status(403).json({ message: "Chỉ staff/admin mới có thể thay đổi verifyStatus" });
      if (!["verify", "nonverify"].includes(verifyStatus))
        return res.status(400).json({ message: "verifyStatus phải là 'verify' hoặc 'nonverify'" });
      post.verifyStatus = verifyStatus;
    }

    await post.save();
    return res.status(200).json({ message: "Cập nhật post thành công", data: post });
  } catch (err) {
    console.error("updateMyPost error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================================================
// DELETE POST
// ======================================================
export const deleteMyPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const post = await PostModel.findByPk(id);
    if (!post) return res.status(404).json({ message: "Không tìm thấy post" });
    if (post.userId !== userId)
      return res.status(403).json({ message: "Bạn không có quyền xoá post này" });

    await post.destroy();
    return res.status(200).json({ message: "Xoá post thành công" });
  } catch (err) {
    console.error("deleteMyPost error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================================================
// GET MY POSTS
// ======================================================
export const getMyPosts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize ?? "10", 10), 1), 50);
    const offset = (page - 1) * pageSize;

    const { rows, count } = await PostModel.findAndCountAll({
      where: { userId },
      include: [{ model: UserModel, attributes: ["id", "username", "avatar"] }],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
    });

    return res.json({ total: count, page, pageSize, data: rows });
  } catch (err) {
    console.error("getMyPosts error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================================================
// GET USER POSTS (public)
// ======================================================
export const getUserPosts = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId))
      return res.status(400).json({ message: "userId không hợp lệ" });

    const posts = await PostModel.findAll({
      where: { userId, verifyStatus: "verify", isActive: true },
      include: [{ model: UserModel, attributes: ["id", "username", "avatar"] }],
      order: [["createdAt", "DESC"]],
    });

    if (!posts?.length)
      return res.status(404).json({ message: "Người dùng này chưa có bài đăng nào" });

    return res.json({ total: posts.length, data: posts });
  } catch (err) {
    console.error("getUserPosts error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
