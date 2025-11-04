// routes/contract.viewer.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import {
  getContractForViewer,
  listMyContracts,
  listMyUnsignedContracts,
} from "../controller/contract.controller.js";
import isCustomer from "../middleware/isCustomer.js";

const router = Router();

/**
 * @swagger
 * /me/contracts:
 *   get:
 *     summary: Lấy toàn bộ hợp đồng của người dùng hiện tại
 *     description: >
 *       Cho phép **buyer hoặc seller (customer)** xem toàn bộ hợp đồng mà họ là một bên tham gia (bao gồm cả hợp đồng đã ký, đang thương lượng, đã hoàn tất...).
 *       Có thể lọc theo phía thông qua query `side=buyer|seller`.
 *     tags: [Contracts - Viewer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: side
 *         in: query
 *         description: Lọc theo vai trò của người dùng trong hợp đồng
 *         required: false
 *         schema:
 *           type: string
 *           enum: [buyer, seller]
 *           example: buyer
 *     responses:
 *       200:
 *         description: Danh sách hợp đồng của người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 viewerRole:
 *                   type: string
 *                   example: user
 *                 total:
 *                   type: integer
 *                   example: 2
 *                 contracts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contract'
 *             example:
 *               viewerRole: user
 *               total: 2
 *               contracts:
 *                 - id: 8
 *                   side: buyer
 *                   status: signed
 *                   agreedPrice: 425000000
 *                   viewerFeePercent: 3
 *                   viewerFeeAmount: 12750000
 *                   seller:
 *                     id: 10
 *                     username: "sellerA"
 *                     email: "sellerA@gmail.com"
 *                   post:
 *                     id: 2
 *                     title: "VinFast VF8"
 *                     category: "vehicle"
 *                 - id: 12
 *                   side: seller
 *                   status: completed
 *                   agreedPrice: 380000000
 *                   viewerFeePercent: 2
 *                   viewerFeeAmount: 7600000
 *       401:
 *         description: Thiếu hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             example: { message: "Missing auth payload" }
 *       403:
 *         description: Không đủ quyền (chỉ customer)
 *         content:
 *           application/json:
 *             example: { message: "Only customers can perform this action" }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             example: { message: "Internal server error" }
 */
router.get("/contracts", authenticateToken, isCustomer, listMyContracts);

/**
 * @swagger
 * /me/contracts/unsigned:
 *   get:
 *     summary: Lấy danh sách hợp đồng chưa ký của người dùng hiện tại
 *     description: >
 *       Trả về các hợp đồng mà người dùng là **buyer hoặc seller** nhưng **chưa hoàn tất ký kết** (trạng thái `pending`, `negotiating`, `awaiting_sign`).
 *       Có thể lọc theo phía thông qua query `side=buyer|seller`.
 *     tags: [Contracts - Viewer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: side
 *         in: query
 *         description: Lọc theo vai trò của người dùng trong hợp đồng
 *         required: false
 *         schema:
 *           type: string
 *           enum: [buyer, seller]
 *           example: seller
 *     responses:
 *       200:
 *         description: Danh sách hợp đồng chưa ký
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 viewerRole:
 *                   type: string
 *                   example: user
 *                 filter:
 *                   type: string
 *                   example: unsigned
 *                 total:
 *                   type: integer
 *                   example: 1
 *                 contracts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Contract'
 *             example:
 *               viewerRole: user
 *               filter: unsigned
 *               total: 1
 *               contracts:
 *                 - id: 14
 *                   side: seller
 *                   status: negotiating
 *                   agreedPrice: 420000000
 *                   viewerFeePercent: 2
 *                   viewerFeeAmount: 8400000
 *                   appointmentTime: "2025-10-25T09:00:00Z"
 *                   appointmentPlace: "Showroom Hyundai, Q1"
 *                   buyer:
 *                     id: 7
 *                     username: "buyerB"
 *                     email: "buyerB@gmail.com"
 *       401:
 *         description: Thiếu hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             example: { message: "Missing auth payload" }
 *       403:
 *         description: Không đủ quyền (chỉ customer)
 *         content:
 *           application/json:
 *             example: { message: "Only customers can perform this action" }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             example: { message: "Internal server error" }
 */
router.get(
  "/contracts/unsigned",
  authenticateToken,
  isCustomer,
  listMyUnsignedContracts
);

/**
 * @swagger
 * /me/contracts/{id}:
 *   get:
 *     summary: Xem chi tiết hợp đồng của chính mình
 *     description: >
 *       Cho phép **buyer hoặc seller (customer)** xem chi tiết hợp đồng mà họ là một bên tham gia.
 *       Admin/Staff không được phép truy cập route này.
 *       Trả về thông tin hợp đồng đã loại bỏ OTP và các trường nhạy cảm.
 *     tags: [Contracts - Viewer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID của hợp đồng
 *         schema:
 *           type: integer
 *           example: 8
 *     responses:
 *       200:
 *         description: Lấy chi tiết hợp đồng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 viewerRole:
 *                   type: string
 *                   example: buyer
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *             examples:
 *               buyerView:
 *                 summary: Buyer xem hợp đồng
 *                 value:
 *                   viewerRole: buyer
 *                   contract:
 *                     id: 8
 *                     buyerId: 13
 *                     sellerId: 10
 *                     postId: 2
 *                     agreedPrice: 425000000
 *                     status: "awaiting_sign"
 *                     appointmentTime: "2025-10-18T09:00:00Z"
 *                     appointmentPlace: "Showroom Toyota, Q7"
 *                     appointmentNote: "Buyer sẽ xem xe cùng người thân"
 *                     buyerFeePercent: 3
 *                     signedAt: null
 *                     completedAt: null
 *                     createdAt: "2025-10-16T10:19:09.137Z"
 *                     updatedAt: "2025-10-16T11:10:29.577Z"
 *       401:
 *         description: Thiếu hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             example: { message: "Unauthorized" }
 *       403:
 *         description: Không đủ quyền (chỉ customer được phép)
 *         content:
 *           application/json:
 *             examples:
 *               notCustomer:
 *                 value: { message: "Only customers can perform this action (admins and staff cannot buy or sell)." }
 *               notParticipant:
 *                 value: { message: "You are not allowed to view this contract." }
 *       404:
 *         description: Không tìm thấy hợp đồng
 *         content:
 *           application/json:
 *             example: { message: "Contract not found" }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             example: { message: "Internal server error" }
 */
router.get("/contracts/:id", authenticateToken, isCustomer, getContractForViewer);

export default router;
