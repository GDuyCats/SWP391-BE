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
    const { id } = req.params;

    const request = await PurchaseRequestModel.findByPk(id);
    if (!request) return res.status(404).json({ message: "Purchase request not found" });

    // // Role check
    // const isAdmin = actor.role === "admin";
    // const isSeller = actor.id === request.sellerId;
    // const isStaff = actor.role === "staff";

    if (!(isAdmin || isSeller || isStaff))
      return res.status(403).json({ message: "You are not allowed to accept this request" });

    if (request.status !== "pending")
      return res.status(400).json({ message: `Cannot accept a ${request.status} request` });

    // Cập nhật trạng thái request
    request.status = "accepted";
    request.handledBy = actor.id;
    await request.save();

    // Tạo contract tương ứng
    const contract = await ContractModel.create({
      requestId: request.id,
      buyerId: request.buyerId,
      sellerId: request.sellerId,
      postId: request.postId,
      status: "pending",
      notes: request.message || null,
    });

    return res.status(200).json({
      message: "Purchase request accepted, contract created",
      contract,
    });
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

    if (!(isAdmin || isSeller || isStaff))
      return res.status(403).json({ message: "You are not allowed to reject this request" });

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
    if (actor.role !== "admin") return res.status(403).json({ message: "Admin only" });

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
