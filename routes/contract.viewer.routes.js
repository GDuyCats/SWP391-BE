// routes/contract.viewer.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { getContractForViewer } from "../controller/contract.controller.js";
import isCustomer from "../middleware/isCustomer.js"
const router = Router();

// Người dùng xem hợp đồng của chính mình (buyer/seller/staff/admin)
/**
 * @swagger
 * /contracts/{id}:
 *   get:
 *     summary: Xem hợp đồng của chính mình
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
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Unauthorized"
 *       403:
 *         description: Không đủ quyền (chỉ customer được phép)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notCustomer:
 *                 value: { message: "Only customers can perform this action (admins and staff cannot buy or sell)." }
 *               notParticipant:
 *                 value: { message: "You are not allowed to view this contract." }
 *       404:
 *         description: Không tìm thấy hợp đồng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Contract not found"
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

router.get("/contracts/:id", isCustomer, authenticateToken, getContractForViewer);

export default router;
