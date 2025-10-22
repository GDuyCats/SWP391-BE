// controllers/post.public.controller.js
import { Op, literal } from "sequelize";
import { PostModel, UserModel } from "../postgres/postgres.js";

const VALID_CATEGORIES = ["battery", "vehicle"];
const VALID_VIP_TIERS = ["diamond", "gold", "silver"];

export const listAdvancedPublicPosts = async (req, res) => {
  try {
    const {
      q = "",
      minPrice,
      maxPrice,
      dateFrom,
      dateTo,
      sort = "vip_newest", // vip_newest | vip_oldest | price_asc | price_desc
      page = "1",
      pageSize = "10",
      category,

      // 🔥 NEW: VIP filters
      vipTier,
      vipPriority,
      vipPriorityMin,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 50);
    const offset = (pageNum - 1) * sizeNum;

    // ===== where: chỉ bài đang active =====
    const where = { isActive: true };

    // Tìm kiếm theo tiêu đề/nội dung
    if (q.trim()) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${q.trim()}%` } },
        { content: { [Op.iLike]: `%${q.trim()}%` } },
      ];
    }

    // Lọc category
    if (category && VALID_CATEGORIES.includes(String(category))) {
      where.category = category;
    }

    // Lọc theo price
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice !== undefined) where.price[Op.gte] = Number(minPrice);
      if (maxPrice !== undefined) where.price[Op.lte] = Number(maxPrice);
    }

    // Lọc theo ngày tạo
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(`${dateFrom}T00:00:00Z`);
      if (dateTo) where.createdAt[Op.lte] = new Date(`${dateTo}T23:59:59Z`);
    }

    // ===== 🔥 VIP filters (mới) =====
    // 1) vipTier = diamond | gold | silver
    if (vipTier !== undefined) {
      const tier = String(vipTier).toLowerCase().trim();
      if (!VALID_VIP_TIERS.includes(tier)) {
        return res.status(400).json({
          message: "vipTier must be one of: diamond | gold | silver",
          received: vipTier,
        });
      }
      where.vipTier = tier;
    }

    // 2) vipPriority (bằng)
    if (vipPriority !== undefined) {
      const n = Number(vipPriority);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({ message: "vipPriority must be a number >= 0" });
      }
      where.vipPriority = n;
    } else if (vipPriorityMin !== undefined) {
      // 3) vipPriorityMin (>=)
      const m = Number(vipPriorityMin);
      if (Number.isNaN(m) || m < 0) {
        return res.status(400).json({ message: "vipPriorityMin must be a number >= 0" });
      }
      where.vipPriority = { [Op.gte]: m };
    }

    // VIP còn hạn lên trước (không bắt buộc là VIP-only)
    const vipSort = literal(`CASE 
      WHEN "Posts"."isVip" = true AND "Posts"."vipExpiresAt" > NOW() THEN 0 
      ELSE 1 
    END`);

    // ===== order =====
    let order;
    switch (sort) {
      case "vip_oldest":
        order = [[vipSort, "ASC"], ["vipPriority", "DESC"], ["createdAt", "ASC"], ["id", "ASC"]];
        break;
      case "price_asc":
        order = [[vipSort, "ASC"], ["vipPriority", "DESC"], ["price", "ASC"], ["createdAt", "DESC"]];
        break;
      case "price_desc":
        order = [[vipSort, "ASC"], ["vipPriority", "DESC"], ["price", "DESC"], ["createdAt", "DESC"]];
        break;
      case "vip_newest":
      default:
        order = [[vipSort, "ASC"], ["vipPriority", "DESC"], ["createdAt", "DESC"], ["id", "DESC"]];
        break;
    }

    // ===== query =====
    const { rows, count } = await PostModel.findAndCountAll({
      where,
      include: [{ model: UserModel, attributes: ["id", "username", "avatar"] }],
      order,
      limit: sizeNum,
      offset,
    });

    return res.json({
      total: count,
      page: pageNum,
      pageSize: sizeNum,
      data: rows,
    });
  } catch (err) {
    console.error("listAdvancedPublicPosts error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
