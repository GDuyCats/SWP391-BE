// controllers/post.verify.controller.js
import { PostModel, UserModel } from "../postgres/postgres.js";

const getAllPosts = async (req, res) => {
  try {
    const role = req.user?.role;
    if (!["admin", "staff"].includes(role)) {
      return res.status(403).json({ message: "Bạn không có quyền xem toàn bộ bài đăng" });
    }

    const posts = await PostModel.findAll({
      include: [{ model: UserModel, attributes: ["id", "username", "avatar"] }],
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

const verifyPost = async (req, res) => {
  try {
    const userRole = req.user?.role;   // lấy từ token (authenticateToken)
    const { id } = req.params;
    const { verifyStatus } = req.body; // "verify" hoặc "nonverify"

    if (!["admin", "staff"].includes(userRole)) {
      return res.status(403).json({ message: "Bạn không có quyền duyệt bài" });
    }

    if (!["verify", "nonverify"].includes(verifyStatus)) {
      return res.status(400).json({ message: "verifyStatus phải là 'verify' hoặc 'nonverify'" });
    }

    const post = await PostModel.findByPk(id);
    if (!post) return res.status(404).json({ message: "Không tìm thấy post" });

    post.verifyStatus = verifyStatus;
    await post.save();

    return res.json({
      message: `Cập nhật trạng thái bài đăng #${id} thành công`,
      data: post,
    });
  } catch (err) {
    console.error("verifyPost error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export {verifyPost, getAllPosts}
