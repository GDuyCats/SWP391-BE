import { PostModel, UserModel } from "../postgres/postgres.js";
const MAX_FREE = 3;
const MAX_VIP = 10;

export const enforcePostQuota = async (req, res, next) => {
  try {
    // userId lấy từ authenticateToken (bạn đã có)
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await UserModel.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Admin/Staff có thể bypass nếu bạn muốn
    if (user.role === "admin" || user.role === "staff") {
      return next();
    }

    const isVip = user.isVipActive(); // method đã thêm ở trên
    const quota = isVip ? MAX_VIP : MAX_FREE;

    // Đếm số bài đang hiển thị
    const current = await PostModel.count({
      where: {
        userId,
        isDeleted: false,
        status: "published", // chỉnh theo business của bạn
      },
    });

    if (current >= quota) {
      return res.status(403).json({
        message: isVip
          ? `Bạn đã đạt tối đa ${MAX_VIP} bài đăng đang hiển thị cho tài khoản VIP. Hãy ẩn/xóa bớt hoặc chờ mở rộng gói.`
          : `Bạn đang dùng gói thường (tối đa ${MAX_FREE} bài). Vui lòng nâng VIP để đăng tối đa ${MAX_VIP} bài.`,
        canUpgrade: !isVip,
        // Gợi ý front-end bấm nâng cấp (bạn có thể truyền sẵn link PayOS checkout đã tạo)
      });
    }

    return next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Internal server error" });
  }
};