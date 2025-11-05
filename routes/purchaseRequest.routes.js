import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import {
  createPurchaseRequest,
  acceptPurchaseRequest,
  rejectPurchaseRequest,
  withdrawPurchaseRequest,
  listPurchaseRequestsByPost,
  listMyPurchaseRequests,
  getPurchaseRequestById,
  adminListPurchaseRequests,
  listVehiclePurchaseRequests
} from "../controller/purchaseRequest.controller.js";
import isCustomer from "../middleware/isCustomer.js";
import isAdmin from "../middleware/isAdmin.js";
import isCustomerOrAdmin from "../middleware/isCustomerAndAdmin.js";
import isStaffOrAdmin from "../middleware/isStaffAndAdmin.js"
const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Purchase Requests
 *     description: API quản lý yêu cầu mua xe giữa Buyer – Seller – Staff – Admin
 */
/**
 * @openapi
 * /PurchaseRequests/admin:
 *   get:
 *     tags: [Purchase Requests]
 *     summary: Admin xem toàn bộ yêu cầu mua
 *     description: |
 *       - Admin có thể xem tất cả yêu cầu, lọc theo status, postId, buyerId, sellerId, handledBy, createdAt range.  
 *       - Hỗ trợ phân trang và sắp xếp.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, accepted, rejected, withdrawn, expired] }
 *       - in: query
 *         name: postId
 *         schema: { type: integer }
 *       - in: query
 *         name: buyerId
 *         schema: { type: integer }
 *       - in: query
 *         name: sellerId
 *         schema: { type: integer }
 *       - in: query
 *         name: handledBy
 *         schema: { type: integer }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, example: 10 }
 *     responses:
 *       200:
 *         description: Danh sách request cho admin
 *       403:
 *         description: Admin only
 *       500:
 *         description: Internal server error
 */
router.get("/admin", authenticateToken, isAdmin, adminListPurchaseRequests);
/**
 * @openapi
 * /PurchaseRequests:
 *   post:
 *     tags: [Purchase Requests]
 *     summary: Buyer gửi yêu cầu mua bài đăng
 *     description: |
 *       - Buyer gửi yêu cầu mua đến bài đăng xe.  
 *       - Không thể gửi yêu cầu cho bài của chính mình hoặc cho bài chưa được active.  
 *       - Mỗi Buyer chỉ có thể có **1 yêu cầu pending** cho cùng 1 bài post.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId: { type: integer, example: 12 }
 *               message: { type: string, example: "Tôi muốn hẹn gặp để xem xe vào cuối tuần." }
 *     responses:
 *       201:
 *         description: Request created
 *       400:
 *         description: Missing postId or invalid post
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate pending request
 *       500:
 *         description: Internal server error
 */
router.post("/", authenticateToken,isCustomer, createPurchaseRequest);

/**
 * @openapi
 * /PurchaseRequests/{id}/accept:
 *   patch:
 *     tags: [Purchase Requests]
 *     summary: Admin chấp nhận yêu cầu mua
 *     description: |
 *       - Khi chấp nhận, hệ thống tự động tạo **Contract** mới với trạng thái `pending`.  
 *       - Chỉ `Admin` của bài đăng mới có quyền thao tác.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của purchase request
 *     responses:
 *       200:
 *         description: Accepted and contract created
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Request không tồn tại
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/accept", authenticateToken, isAdmin, acceptPurchaseRequest);

/**
 * @openapi
 * /PurchaseRequests/{id}/reject:
 *   patch:
 *     tags: [Purchase Requests]
 *     summary: Seller từ chối yêu cầu mua
 *     description: |
 *       - Có thể gửi kèm `reason` để ghi chú lý do từ chối.  
 *       - Chỉ `seller` của bài đăng mới có quyền thao tác.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của purchase request
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, example: "Xe đã bán cho người khác" }
 *     responses:
 *       200:
 *         description: Request rejected
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Request không tồn tại
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/reject", authenticateToken, isCustomerOrAdmin, rejectPurchaseRequest);

/**
 * @openapi
 * /PurchaseRequests/{id}/withdraw:
 *   patch:
 *     tags: [Purchase Requests]
 *     summary: Buyer rút lại yêu cầu mua
 *     description: |
 *       - Buyer có thể rút lại **yêu cầu đang pending** của mình.  
 *       - Không thể rút khi đã được xử lý (accepted/rejected).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của purchase request
 *     responses:
 *       200:
 *         description: Withdrawn successfully
 *       400:
 *         description: Request không còn ở trạng thái pending
 *       403:
 *         description: Không có quyền
 *       404:
 *         description: Request không tồn tại
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/withdraw", authenticateToken, isCustomer, withdrawPurchaseRequest);

/**
 * @openapi
 * /PurchaseRequests/post/{postId}:
 *   get:
 *     tags: [Purchase Requests]
 *     summary: Seller/Admin xem danh sách request theo bài post
 *     description: |
 *       - Seller của bài post hoặc Admin có thể xem toàn bộ yêu cầu mua của bài đó.  
 *       - Mỗi request gồm thông tin buyer, trạng thái, và message.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Danh sách yêu cầu
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Bài đăng không tồn tại
 *       500:
 *         description: Internal server error
 */
router.get("/post/:postId", authenticateToken, isCustomerOrAdmin, listPurchaseRequestsByPost);

/**
 * @openapi
 * /PurchaseRequests/me:
 *   get:
 *     tags: [Purchase Requests]
 *     summary: Buyer xem danh sách các yêu cầu của chính mình
 *     description: |
 *       - Buyer có thể xem tất cả yêu cầu mình đã gửi, lọc theo `status` hoặc `postId`.  
 *       - Hỗ trợ phân trang và sắp xếp theo thời gian tạo.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, accepted, rejected, withdrawn, expired] }
 *       - in: query
 *         name: postId
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, example: 10 }
 *     responses:
 *       200:
 *         description: Danh sách request của buyer
 *       401:
 *         description: Chưa đăng nhập
 *       500:
 *         description: Internal server error
 */
router.get("/me", authenticateToken,isCustomer, listMyPurchaseRequests);

/**
 * @openapi
 * /PurchaseRequests/{id}:
 *   get:
 *     tags: [Purchase Requests]
 *     summary: Xem chi tiết 1 yêu cầu
 *     description: |
 *       - Buyer, Seller, Staff, hoặc Admin của request đều có thể xem chi tiết.  
 *       - Trả về đầy đủ thông tin buyer/seller/handler và post liên quan.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Chi tiết request
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Request không tồn tại
 *       500:
 *         description: Internal server error
 */
router.get("/:id", authenticateToken, getPurchaseRequestById);

/**
 * @openapi
 * /PurchaseRequests/vehicle-purchase-requests:
 *   get:
 *     tags: [Purchase Requests]
 *     summary: Staff/Admin xem các yêu cầu MUA XE (post.category = "vehicle")
 *     description: |
 *       - Trả về **chỉ** các purchase request gắn với bài đăng có `category = "vehicle"`.
 *       - Hỗ trợ lọc theo `status`, `buyerId`, `sellerId`, phân trang và sắp xếp.
 *       - Yêu cầu quyền: **Staff** hoặc **Admin**.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         description: Lọc theo trạng thái yêu cầu
 *         schema:
 *           type: string
 *           enum: [pending, accepted, rejected, withdrawn, expired]
 *       - in: query
 *         name: buyerId
 *         schema: { type: integer }
 *       - in: query
 *         name: sellerId
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 10 }
 *       - in: query
 *         name: sort
 *         description: Trường sắp xếp, dạng `field:direction` (ví dụ: `createdAt:desc`)
 *         schema:
 *           type: string
 *           example: createdAt:desc
 *     responses:
 *       200:
 *         description: Danh sách request của bài đăng **vehicle**
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:    { type: integer, example: 37 }
 *                 page:     { type: integer, example: 1 }
 *                 pageSize: { type: integer, example: 10 }
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:        { type: integer, example: 123 }
 *                       buyerId:   { type: integer, example: 25 }
 *                       sellerId:  { type: integer, example: 26 }
 *                       postId:    { type: integer, example: 55 }
 *                       status:    { type: string, enum: [pending, accepted, rejected, withdrawn, expired], example: pending }
 *                       handledBy: { type: integer, nullable: true, example: 10 }
 *                       createdAt: { type: string, format: date-time, example: "2025-11-03T04:02:08.202Z" }
 *                       Post:
 *                         type: object
 *                         properties:
 *                           id:         { type: integer, example: 55 }
 *                           title:      { type: string, example: "Bán xe" }
 *                           category:   { type: string, example: "vehicle" }
 *                           price:      { type: number, format: float, example: 272500.00 }
 *                           verifyStatus: { type: string, example: "verified" }
 *                           isActive:   { type: boolean, example: true }
 *                       buyer:
 *                         type: object
 *                         properties:
 *                           id:       { type: integer, example: 25 }
 *                           username: { type: string, example: "bao" }
 *                           email:    { type: string, example: "bao@gmail.com" }
 *                       seller:
 *                         type: object
 *                         properties:
 *                           id:       { type: integer, example: 26 }
 *                           username: { type: string, example: "phuong" }
 *                           email:    { type: string, example: "phuong@gmail.com" }
 *       403:
 *         description: Chỉ Staff/Admin được phép truy cập
 *       500:
 *         description: Internal server error
 */
router.get("/vehicle-purchase-requests", authenticateToken,  isStaffOrAdmin, listVehiclePurchaseRequests);


export default router;
