// controllers/post.public.controller.js
import { Op } from "sequelize";
import { PostModel, UserModel } from "../postgres/postgres.js";

const VALID_CATEGORIES = ["battery", "vehicle"];

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
      includeUnverified,
      category,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 50);
    const offset = (pageNum - 1) * sizeNum;

    // ===== where =====
    const where = {
      isActive: true,
      isVip: true,
      vipExpiresAt: { [Op.gt]: new Date() }, // 🔥 chỉ lấy bài VIP còn hạn
    };

    if (includeUnverified !== "true") where.verifyStatus = "verify";

    if (q.trim()) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${q.trim()}%` } },
        { content: { [Op.iLike]: `%${q.trim()}%` } },
      ];
    }

    if (VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = Number(minPrice);
      if (maxPrice) where.price[Op.lte] = Number(maxPrice);
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(`${dateFrom}T00:00:00Z`);
      if (dateTo) where.createdAt[Op.lte] = new Date(`${dateTo}T23:59:59Z`);
    }

    // ===== order =====
    let order;
    switch (sort) {
      case "vip_oldest":
        order = [["vipPriority", "DESC"], ["createdAt", "ASC"], ["id", "ASC"]];
        break;
      case "price_asc":
        order = [["vipPriority", "DESC"], ["price", "ASC"], ["createdAt", "DESC"]];
        break;
      case "price_desc":
        order = [["vipPriority", "DESC"], ["price", "DESC"], ["createdAt", "DESC"]];
        break;
      case "vip_newest":
      default:
        order = [["vipPriority", "DESC"], ["createdAt", "DESC"], ["id", "DESC"]];
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

    if (count === 0) {
      return res.status(404).json({
        message: "Không tìm thấy bài VIP nào phù hợp",
        filters: { q, minPrice, maxPrice, dateFrom, dateTo, category },
      });
    }

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
