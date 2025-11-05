 import { PurchaseRequestModel, PostModel, UserModel, ContractModel } from "../postgres/postgres.js";
/**
 * Buyer gửi yêu cầu mua (Bước 1)
 */
export const createPurchaseRequest = async (req, res) => {
  try {
    const buyerId = req.user?.id;
    const { postId, message } = req.body;

    if (!buyerId) return res.status(401).json({ message: "Missing auth payload" });
    if (!postId) return res.status(400).json({ message: "Missing postId" });

    // Lấy bài đăng
    const post = await PostModel.findByPk(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const sellerId = post.userId;
    if (sellerId === buyerId)
      return res.status(400).json({ message: "You cannot send a request to your own post" });

    if (post.category === "battery")
      return res.status(400).json({ message: "Purchase requests are only allowed for vehicles" });

    // Kiểm tra trùng yêu cầu
    const existed = await PurchaseRequestModel.findOne({
      where: { buyerId, postId, status: "pending" },
    });
    if (existed)
      return res.status(409).json({ message: "You already sent a pending request for this post" });

    const request = await PurchaseRequestModel.create({
      buyerId,
      sellerId,
      postId,
      message,
      status: "pending",
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 ngày
    });

    return res.status(201).json({
      message: "Purchase request created successfully",
      request,
    });
  } catch (err) {
    console.error("[purchaseRequests/create] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * Admin hoặc Seller (hoặc Staff được phân quyền) chấp nhận yêu cầu → tạo Contract
 */
export const acceptPurchaseRequest = async (req, res) => {
  try {
    const actor = req.user;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const result = await sequelize.transaction(async (t) => {
      // 1) Khóa bản ghi yêu cầu để tránh accept trùng
      const request = await PurchaseRequestModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!request) {
        return { code: 404, body: { message: "Purchase request not found" } };
      }

      if (request.status !== "pending") {
        return {
          code: 400,
          body: { message: `Cannot accept a ${request.status} request` },
        };
      }

      // 2) Lấy bài post để biết category (vehicle/battery)
      const post = await PostModel.findByPk(request.postId, {
        attributes: ["id", "category", "verifyStatus", "isActive"],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!post) {
        return { code: 409, body: { message: "Related post not found" } };
      }

      // (tùy bạn, có thể giữ/bỏ 2 điều kiện dưới)
      if (post.verifyStatus !== "verified" || !post.isActive) {
        return {
          code: 409,
          body: { message: "Post is not eligible (must be verified & active)." },
        };
      }

      // 3) Cập nhật trạng thái request -> accepted
      request.status = "accepted";
      request.handledBy = actor?.id ?? null;
      await request.save({ transaction: t });

      // 4) Chỉ tạo contract nếu là VEHICLE
      let contract = null;
      if (post.category === "vehicle") {
        contract = await ContractModel.create(
          {
            requestId: request.id,
            buyerId: request.buyerId,
            sellerId: request.sellerId,
            postId: request.postId,
            status: "pending",
            notes: request.message || null,
          },
          { transaction: t }
        );
      }

      // 5) Trả kết quả phù hợp theo category
      return {
        code: 200,
        body: {
          message:
            post.category === "vehicle"
              ? "Purchase request accepted, contract created"
              : "Purchase request accepted (no contract required for this category)",
          contract, // sẽ là null nếu category != vehicle (vd: battery)
          purchaseRequest: request,
        },
      };
    });

    return res.status(result.code).json(result.body);
  } catch (err) {
    console.error("[purchaseRequests/accept] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * Admin / Seller / Staff từ chối yêu cầu
 */
export const rejectPurchaseRequest = async (req, res) => {
  try {
    const actor = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    const request = await PurchaseRequestModel.findByPk(id);
    if (!request) return res.status(404).json({ message: "Purchase request not found" });

    const isAdmin = actor.role === "admin";
    const isSeller = actor.id === request.sellerId;
    const isStaff = actor.role === "staff";

    // if (!(isAdmin || isSeller || isStaff))
    //   return res.status(403).json({ message: "You are not allowed to reject this request" });

    if (request.status !== "pending")
      return res.status(400).json({ message: `Cannot reject a ${request.status} request` });

    request.status = "rejected";
    request.rejectReason = reason || null;
    request.handledBy = actor.id;
    await request.save();

    return res.status(200).json({
      message: "Purchase request rejected",
      request,
    });
  } catch (err) {
    console.error("[purchaseRequests/reject] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * Buyer rút lại yêu cầu
 */
export const withdrawPurchaseRequest = async (req, res) => {
  try {
    const buyer = req.user;
    const { id } = req.params;

    const request = await PurchaseRequestModel.findByPk(id);
    if (!request) return res.status(404).json({ message: "Purchase request not found" });
    if (request.buyerId !== buyer.id)
      return res.status(403).json({ message: "You can only withdraw your own request" });

    if (request.status !== "pending")
      return res.status(400).json({ message: "Only pending requests can be withdrawn" });

    request.status = "withdrawn";
    await request.save();

    return res.status(200).json({
      message: "Purchase request withdrawn successfully",
      request,
    });
  } catch (err) {
    console.error("[purchaseRequests/withdraw] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * Seller hoặc Buyer xem danh sách request theo bài post
 */
export const listPurchaseRequestsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const actor = req.user;

    if (!postId) return res.status(400).json({ message: "Missing postId" });

    const post = await PostModel.findByPk(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Chỉ cho phép seller của post hoặc admin xem danh sách
    if (actor.id !== post.userId && actor.role !== "admin")
      return res.status(403).json({ message: "You are not allowed to view requests for this post" });

    const requests = await PurchaseRequestModel.findAll({
      where: { postId },
      order: [["createdAt", "DESC"]],
      include: [
        { model: UserModel, as: "buyer", attributes: ["id", "username", "email"] },
      ],
    });

    return res.status(200).json({
      message: "List of purchase requests",
      count: requests.length,
      requests,
    });
  } catch (err) {
    console.error("[purchaseRequests/listByPost] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * Buyer xem danh sách yêu cầu của chính mình
 * Query: ?status=pending|accepted|rejected|withdrawn|expired&postId=123&page=1&pageSize=10
 */
export const listMyPurchaseRequests = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ message: "Missing auth payload" });

    const {
      status,            // optional
      postId,            // optional
      page = 1,
      pageSize = 10,
      sort = "createdAt_desc", // createdAt_desc | createdAt_asc
    } = req.query;

    const where = { buyerId: user.id };
    if (status) where.status = status;
    if (postId) where.postId = Number(postId);

    const limit = Math.min(Number(pageSize) || 10, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    const order =
      sort === "createdAt_asc" ? [["createdAt", "ASC"]] : [["createdAt", "DESC"]];

    const { rows, count } = await PurchaseRequestModel.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        // vài thông tin hữu ích để FE render
        { model: PostModel, attributes: ["id", "title", "category", "price", "userId"] },
        { model: UserModel, as: "seller", attributes: ["id", "username", "email"] },
      ],
    });

    return res.status(200).json({
      message: "Your purchase requests",
      page: Number(page),
      pageSize: limit,
      total: count,
      requests: rows,
    });
  } catch (err) {
    console.error("[purchaseRequests/listMy] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
/**
 * Buyer xem chi tiết 1 request của chính mình (hoặc Admin/Seller/Staff nếu là bên liên quan)
 */
export const getPurchaseRequestById = async (req, res) => {
  try {
    const actor = req.user;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const r = await PurchaseRequestModel.findByPk(id, {
      include: [
        { model: PostModel, attributes: ["id", "title", "category", "price", "userId"] },
        { model: UserModel, as: "buyer", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "seller", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "handler", attributes: ["id", "username", "email"] },
      ],
    });
    if (!r) return res.status(404).json({ message: "Purchase request not found" });

    const isBuyer = r.buyerId === actor.id;
    const isSeller = r.sellerId === actor.id;
    const isAdmin = actor.role === "admin";
    const isStaff = actor.role === "staff";

    if (!(isBuyer || isSeller || isAdmin || isStaff)) {
      return res.status(403).json({ message: "Not allowed to view this request" });
    }

    return res.status(200).json({ message: "Request detail", request: r });
  } catch (err) {
    console.error("[purchaseRequests/getById] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const adminListPurchaseRequests = async (req, res) => {
  try {
    const actor = req.user;
    if (!actor?.id) return res.status(401).json({ message: "Missing auth payload" });
    const {
      status,
      postId,
      buyerId,
      sellerId,
      handledBy,
      from, // ISO date
      to,   // ISO date
      page = 1,
      pageSize = 10,
      sort = "createdAt_desc",
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (postId) where.postId = Number(postId);
    if (buyerId) where.buyerId = Number(buyerId);
    if (sellerId) where.sellerId = Number(sellerId);
    if (handledBy) where.handledBy = Number(handledBy);

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.$gte = new Date(from);
      if (to)   where.createdAt.$lte = new Date(to);
    }

    const limit = Math.min(Number(pageSize) || 10, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
    const order = sort === "createdAt_asc" ? [["createdAt", "ASC"]] : [["createdAt", "DESC"]];

    const { rows, count } = await PurchaseRequestModel.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        { model: PostModel, attributes: ["id", "title", "category", "price", "userId"] },
        { model: UserModel, as: "buyer", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "seller", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "handler", attributes: ["id", "username", "email"] },
      ],
    });

    return res.status(200).json({
      message: "Admin purchase requests",
      page: Number(page),
      pageSize: limit,
      total: count,
      requests: rows,
    });
  } catch (err) {
    console.error("[purchaseRequests/adminList] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const listVehiclePurchaseRequests = async (req, res) => {
  try {
    const {
      status, buyerId, sellerId,
      page = "1", pageSize = "10",
      sort = "createdAt:desc",
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const sizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 10, 1), 100);
    const offset = (pageNum - 1) * sizeNum;

    const where = {};
    if (status) where.status = status;
    if (buyerId) where.buyerId = Number(buyerId);
    if (sellerId) where.sellerId = Number(sellerId);

    const [field, dir] = String(sort).split(":");
    const order = [[field || "createdAt", (dir || "desc").toUpperCase()]];

    const result = await PurchaseRequestModel.findAndCountAll({
      where,
      include: [
        {
          model: PostModel,
          attributes: ["id", "title", "category", "price", "verifyStatus", "isActive"],
          where: { category: "vehicle" }, // 🔴 chỉ xe
          required: true,
        },
        { model: UserModel, as: "buyer", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "seller", attributes: ["id", "username", "email"] },
      ],
      attributes: ["id", "buyerId", "sellerId", "postId", "status", "handledBy", "createdAt"],
      order,
      limit: sizeNum,
      offset,
      distinct: true, // đếm đúng khi có JOIN
    });

    return res.status(200).json({
      total: result.count,
      page: pageNum,
      pageSize: sizeNum,
      items: result.rows,
    });
  } catch (err) {
    console.error("[admin list vehicle PR] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const getPurchaseRequestDetail = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const pr = await PurchaseRequestModel.findByPk(id, {
      include: [
        {
          model: PostModel,
          attributes: ["id", "title", "category", "price", "verifyStatus", "isActive"],
          required: true,
        },
        { model: UserModel, as: "buyer", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "seller", attributes: ["id", "username", "email"] },
      ],
    });
    if (!pr) return res.status(404).json({ message: "Purchase request not found" });

    // 🔴 Chỉ cho xem nếu là xe
    if (pr.Post?.category !== "vehicle") {
      return res.status(404).json({ message: "Purchase request not found" });
    }

    return res.status(200).json(pr);
  } catch (err) {
    console.error("[admin get PR detail] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
