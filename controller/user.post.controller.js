import { UserModel, PostModel, sequelize } from "../postgres/postgres.js";
const PHONE_REGEX = /^(?:\+84|0)(?:\d{9,10})$/;
const VALID_TYPES = ["vip", "nonvip"];
const VALID_VERIFY = ["verify", "nonverify"];
function normalizeImages(input) {
  if (input == null) return [];
  if (typeof input === "string") {
    try {
      const maybe = JSON.parse(input);
      return Array.isArray(maybe) ? maybe.map(String) : (input.trim() ? [input.trim()] : []);
    } catch {
      return input.trim() ? [input.trim()] : [];
    }
  }
  if (Array.isArray(input)) return input.map(String);
  return [];
}
const createMyPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const { title, content, thumbnail, image, price, phone, type, category } = req.body ?? {};
    if (!title?.trim()) return res.status(400).json({ message: "title là bắt buộc" });
    if (!content?.trim()) return res.status(400).json({ message: "content là bắt buộc" });

    const images = normalizeImages(image);
    const priceNum = price == null ? 0 : Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0)
      return res.status(400).json({ message: "price phải là số >= 0" });
    if (phone && !PHONE_REGEX.test(String(phone)))
      return res.status(400).json({ message: "Số điện thoại không hợp lệ (VN)" });

    const post = await PostModel.create({
      userId,
      title: title.trim(),
      content: content.trim(),
      thumbnail: thumbnail ? String(thumbnail).trim() : null,
      image: images,
      price: priceNum,
      phone: phone ? String(phone) : null,
      type: VALID_TYPES.includes(type) ? type : "nonvip",
      // ✅ luôn mặc định nonverify khi tạo
      category: category && ["battery", "vehicle"].includes(category) ? category : "vehicle",
      verifyStatus: "nonverify",
    });

    return res.status(201).json({ message: "Tạo bài đăng thành công", data: post });
  } catch (err) {
    console.error("createMyPost error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateMyPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const post = await PostModel.findByPk(id);
    if (!post) return res.status(404).json({ message: "Không tìm thấy post" });
    if (post.userId !== userId) return res.status(403).json({ message: "Bạn không có quyền sửa post này" });

    const { title, content, thumbnail, image, price, phone, type, verifyStatus, category } = req.body ?? {};

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
    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) return res.status(400).json({ message: "type phải là 'vip' hoặc 'nonvip'" });
      post.type = type;
    }
    if (category !== undefined) {
      if (!["battery", "vehicle"].includes(category)) {
        return res.status(400).json({ message: "category phải là 'battery' hoặc 'vehicle'" });
      }
      post.category = category;
    }
    // ✅ CHÚ Ý: Nếu bạn muốn chỉ admin/mod duyệt thì kiểm tra role ở đây rồi mới cho đổi.
    if (verifyStatus !== undefined) {
      if (!VALID_VERIFY.includes(verifyStatus))
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

const deleteMyPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!id || isNaN(+id)) return res.status(400).json({ message: "Post id không hợp lệ" });

    const post = await PostModel.findByPk(id);
    if (!post) return res.status(404).json({ message: "Không tìm thấy post" });
    if (post.userId !== userId) return res.status(403).json({ message: "Bạn không có quyền xoá post này" });

    await post.destroy(); // nếu muốn soft-delete thì đổi sang post.update({ deletedAt: ... })
    return res.status(200).json({ message: "Xoá post thành công" });
  } catch (err) {
    console.error("deleteMyPost error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

const getMyPosts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const pageSizeRaw = Math.max(parseInt(req.query.pageSize ?? "10", 10), 1);
    const pageSize = Math.min(pageSizeRaw, 50);          // limit an toàn
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

const getUserPosts = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    const posts = await PostModel.findAll({
      where: { userId, verifyStatus: "verify" },
      include: [{ model: UserModel, attributes: ["id", "username", "avatar"] }],
      order: [["createdAt", "DESC"]],
    });

    if (!posts || posts.length === 0) {
      return res.status(404).json({ message: "Người dùng này chưa có bài đăng nào" });
    }

    return res.json({ total: posts.length, data: posts });
  } catch (err) {
    console.error("getUserPosts error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export { createMyPost, updateMyPost, deleteMyPost, getMyPosts, getUserPosts }