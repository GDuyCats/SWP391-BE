// controllers/post.public.controller.js
import { Op, Sequelize } from "sequelize";
import { PostModel, UserModel } from "../postgres/postgres.js";

const VIP_FIRST = Sequelize.literal(`CASE WHEN "type" = 'vip' THEN 0 ELSE 1 END`);

export const listAdvancedPublicPosts = async (req, res) => {
  try {
    const {
      q = "",
      type,                 // 'vip' | 'nonvip'
      minPrice,
      maxPrice,
      dateFrom,             // '2025-10-01'
      dateTo,               // '2025-10-09'
      sort = "vip_newest",  // 'vip_newest' | 'vip_oldest' | 'price_asc' | 'price_desc'
      page = "1",
      pageSize = "10",
      includeUnverified,    // 'true' nếu muốn cả nonverify (mặc định false)
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 50);
    const offset = (pageNum - 1) * sizeNum;

    // ===== where =====
    const where = {};
    if (includeUnverified !== "true") where.verifyStatus = "verify";

    if (q.trim()) {
      where[Op.or] = [
        { title:   { [Op.iLike]: `%${q.trim()}%` } },
        { content: { [Op.iLike]: `%${q.trim()}%` } },
      ];
    }

    if (type === "vip" || type === "nonvip") where.type = type;

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = Number(minPrice);
      if (maxPrice) where.price[Op.lte] = Number(maxPrice);
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(`${dateFrom}T00:00:00Z`);
      if (dateTo)   where.createdAt[Op.lte] = new Date(`${dateTo}T23:59:59Z`);
    }

    // ===== order =====
    let order;
    switch (sort) {
      case "vip_oldest":
        order = [[VIP_FIRST, "ASC"], ["createdAt", "ASC"], ["id", "ASC"]];
        break;
      case "price_asc":
        order = [["price", "ASC"], ["createdAt", "DESC"], ["id", "DESC"]];
        break;
      case "price_desc":
        order = [["price", "DESC"], ["createdAt", "DESC"], ["id", "DESC"]];
        break;
      case "vip_newest":
      default:
        order = [[VIP_FIRST, "ASC"], ["createdAt", "DESC"], ["id", "DESC"]];
        break;
    }

    const { rows, count } = await PostModel.findAndCountAll({
      where,
      include: [{ model: UserModel, attributes: ["id", "username", "avatar"] }],
      order,
      limit: sizeNum,
      offset,
    });

    if (count === 0) {
      return res.status(404).json({
        message: "Không tìm thấy bài phù hợp",
        filters: { q, type, minPrice, maxPrice, dateFrom, dateTo },
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
