import { PostModel } from "../postgres/postgres.js";

// Tối đa 10 bài VIP còn hiệu lực cùng lúc
// const MAX_ACTIVE_VIP_POSTS = 3;

export const enforcePostQuota = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Đếm số bài VIP đang còn hiệu lực
    const activeCount = await PostModel.count({
      where: {
        userId,
        isActive: true,
        isVip: true,
      },
    });

    // if (activeCount >= MAX_ACTIVE_VIP_POSTS) {
    //   return res.status(403).json({
    //     message: `Bạn chỉ được phép có tối đa ${MAX_ACTIVE_VIP_POSTS} bài VIP đang hoạt động. Vui lòng ẩn hoặc chờ hết hạn để đăng thêm.`,
    //   });
    // }

    return next();
  } catch (err) {
    console.error("enforcePostQuota error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
