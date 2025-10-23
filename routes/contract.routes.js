import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { createPurchaseRequest } from "../controller/contract.controller.js";
import isCustomer from "../middleware/isCustomer.js";

const router = Router();
/**
 * @swagger
 * /contracts/request:
 *   post:
 *     summary: Buyer gửi yêu cầu mua xe
 *     description: >
 *       Tạo hợp đồng (contract) mới ở trạng thái `pending` cho bài đăng đã được **verify** và có `category=vehicle`.
 *       Chỉ **customer** được phép thực hiện (admin/staff bị chặn).
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - postId
 *             properties:
 *               postId:
 *                 type: integer
 *                 example: 25
 *               message:
 *                 type: string
 *                 example: "Tôi muốn xem xe vào cuối tuần này."
 *     responses:
 *       201:
 *         description: Gửi yêu cầu mua thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Purchase request created
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Lỗi dữ liệu đầu vào hoặc bài chưa verify
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               notVerified:
 *                 value: { message: "This post is not verified yet." }
 *               battery:
 *                 value: { message: "Only vehicle posts can receive purchase requests." }
 *       403:
 *         description: Không đủ quyền (admin/staff không được phép)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Only customers can perform this action (admins and staff cannot buy or sell)."
 *       404:
 *         description: Không tìm thấy bài đăng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Post not found"
 *       409:
 *         description: Buyer đã có contract đang hiệu lực cho bài này
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "An active request/contract already exists for this post by you"
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Buyer gửi yêu cầu mua
router.post("/request",isCustomer, authenticateToken, createPurchaseRequest);

export default router;