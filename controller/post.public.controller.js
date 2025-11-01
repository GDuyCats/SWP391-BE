// controllers/post.public.controller.js
import { Op, literal } from "sequelize";
import {
  PostModel,
  UserModel,
  VehicleDetailModel,
  BatteryDetailModel,
} from "../postgres/postgres.js";

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

      // VIP filters
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

    // ===== VIP filters =====
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

    if (vipPriority !== undefined) {
      const n = Number(vipPriority);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({ message: "vipPriority must be a number >= 0" });
      }
      where.vipPriority = n;
    } else if (vipPriorityMin !== undefined) {
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

    // ===== query (include vehicleDetail + user) =====
    const { rows, count } = await PostModel.findAndCountAll({
      where,
      include: [
        { model: UserModel, attributes: ["id", "username", "avatar"] },
        {
          model: VehicleDetailModel,
          as: "vehicleDetail",           // <-- alias phải khớp associations
          required: false,
          attributes: [
            "brand","model","year","mileage","condition",
            "battery_brand","battery_model","battery_capacity",
            "battery_type","battery_range","battery_condition","charging_time",
          ],
        },
      ],
      order,
      limit: sizeNum,
      offset,
    });

    // ===== map/flatten dữ liệu như detail =====
    const data = rows.map((row) => {
      const p = row.get({ plain: true });
      const v = p.vehicleDetail ?? null;

      const images = Array.isArray(p.image)
        ? p.image
        : Array.isArray(p.images)
        ? p.images
        : [];

      return {
        id: p.id,
        title: p.title,
        content: p.content,
        price: p.price,
        phone: p.phone ?? null,
        category: p.category,
        image: images,
        thumbnail: p.thumbnail ?? null,

        isVip: p.isVip ?? false,
        vipTier: p.vipTier ?? null,
        vipPriority: p.vipPriority ?? 0,
        vipExpiresAt: p.vipExpiresAt ?? null,

        createdAt: p.createdAt,
        updatedAt: p.updatedAt,

        User: p.User
          ? { id: p.User.id, username: p.User.username, avatar: p.User.avatar ?? null }
          : null,

        // Vehicle + battery info (từ VehicleDetails)
        brand: v?.brand ?? null,
        model: v?.model ?? null,
        year: v?.year ?? null,
        mileage: v?.mileage ?? null,
        condition: v?.condition ?? null,
        battery_brand: v?.battery_brand ?? null,
        battery_model: v?.battery_model ?? null,
        battery_capacity: v?.battery_capacity ?? null,
        battery_type: v?.battery_type ?? null,
        battery_range: v?.battery_range ?? null,
        battery_condition: v?.battery_condition ?? null,
        charging_time: v?.charging_time ?? null,
      };
    });

    return res.json({
      total: count,
      page: pageNum,
      pageSize: sizeNum,
      data,
    });
  } catch (err) {
    console.error("listAdvancedPublicPosts error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getPostDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid post id" });
    }
    const [vCount] = await VehicleDetailModel.sequelize.query(
      'SELECT COUNT(*) FROM "VehicleDetails" WHERE "postId" = :id',
      { replacements: { id }, type: VehicleDetailModel.sequelize.QueryTypes.SELECT }
    );
    console.log("VehicleDetails rows for this postId:", vCount.count);
    const post = await PostModel.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: UserModel,
          attributes: ["id", "username", "avatar"],
        },
        {
          model: VehicleDetailModel,
          as: "vehicleDetail",
          required: false,
          attributes: [
            "brand",
            "model",
            "year",
            "mileage",
            "condition",
            "battery_brand",
            "battery_model",
            "battery_capacity",
            "battery_type",
            "battery_range",
            "battery_condition",
            "charging_time",
          ],
        },
      ],
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found or inactive" });
    }

    const p = post.get({ plain: true });
    const v = p.vehicleDetail || null;

    const images = Array.isArray(p.image)
      ? p.image
      : Array.isArray(p.images)
        ? p.images
        : [];

    return res.json({
      id: p.id,
      title: p.title,
      content: p.content,
      price: p.price,
      phone: p.phone ?? null,
      category: p.category,
      image: Array.isArray(p.image) ? p.image : Array.isArray(p.images) ? p.images : [],
      thumbnail: p.thumbnail ?? null,
      isVip: p.isVip ?? false,
      vipTier: p.vipTier ?? null,
      vipPriority: p.vipPriority ?? 0,
      vipExpiresAt: p.vipExpiresAt ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,

      User: p.User
        ? {
          id: p.User.id,
          username: p.User.username,
          avatar: p.User.avatar ?? null,
        }
        : null,

      // VehicleDetail (bao gồm thông tin battery)
      brand: v?.brand ?? null,
      model: v?.model ?? null,
      year: v?.year ?? null,
      mileage: v?.mileage ?? null,
      condition: v?.condition ?? null,
      battery_brand: v?.battery_brand ?? null,
      battery_model: v?.battery_model ?? null,
      battery_capacity: v?.battery_capacity ?? null,
      battery_type: v?.battery_type ?? null,
      battery_range: v?.battery_range ?? null,
      battery_condition: v?.battery_condition ?? null,
      charging_time: v?.charging_time ?? null,
    });
  } catch (err) {
    console.error("getPostDetail error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};