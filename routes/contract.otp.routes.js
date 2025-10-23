// routes/contract.otp.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { sendContractOtp, verifyContractOtp } from "../controller/contract.controller.js";
import isStaff from "../middleware/isStaff.js";

const router = Router();
/**
 * @swagger
 * /staff/contracts/send-otp:
 *   post:
 *     summary: Staff/Admin gửi OTP xác nhận hợp đồng
 *     description: >
 *       Gửi mã OTP (6 chữ số) tới email của **buyer** và **seller** cho hợp đồng đang ở trạng thái **awaiting_sign**.  
 *       Mỗi bên sẽ nhận một mã riêng qua email (gửi bằng SendGrid).  
 *       OTP được lưu trong bảng `Contracts` (các cột `buyerOtp` và `sellerOtp`).
 *     tags: [Contracts - OTP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractId
 *             properties:
 *               contractId:
 *                 type: integer
 *                 example: 8
 *     responses:
 *       200:
 *         description: Gửi OTP thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP sent successfully"
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc contract không phù hợp để gửi OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missing:
 *                 value: { message: "Missing contractId" }
 *               invalidStatus:
 *                 value: { message: "Contract must be in awaiting_sign status before sending OTP" }
 *       401:
 *         description: Thiếu hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example:
 *               message: "Unauthorized"
 *       403:
 *         description: Chỉ staff hoặc admin được phép gửi OTP
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example:
 *               message: "Only staff or admin can send OTP."
 *       404:
 *         description: Không tìm thấy hợp đồng hoặc email của buyer/seller
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             examples:
 *               contractNotFound:
 *                 value: { message: "Contract not found" }
 *               missingEmail:
 *                 value: { message: "Buyer or seller email missing" }
 *       500:
 *         description: Lỗi máy chủ hoặc lỗi gửi email
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /contracts/verify-otp:
 *   post:
 *     summary: Buyer/Seller xác nhận OTP ký hợp đồng
 *     description: >
 *       Buyer và Seller nhập mã OTP được gửi qua email để xác nhận ký hợp đồng.  
 *       Khi cả hai bên đều nhập đúng, trạng thái hợp đồng chuyển thành **signed**, và trường `signedAt` được cập nhật.
 *     tags: [Contracts - OTP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractId
 *               - code
 *             properties:
 *               contractId:
 *                 type: integer
 *                 description: ID của hợp đồng cần xác thực
 *                 example: 8
 *               code:
 *                 type: string
 *                 description: Mã OTP (6 chữ số)
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Xác nhận OTP thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "OTP verified successfully"
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *             examples:
 *               oneSide:
 *                 summary: Một bên đã ký
 *                 value:
 *                   message: "OTP verified for buyer. Waiting for seller."
 *               bothSides:
 *                 summary: Cả hai bên đã ký
 *                 value:
 *                   message: "Both parties signed. Contract marked as signed."
 *                   contract:
 *                     id: 8
 *                     status: "signed"
 *                     signedAt: "2025-10-17T08:30:00Z"
 *       400:
 *         description: Mã OTP sai hoặc hợp đồng không hợp lệ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             examples:
 *               invalidCode:
 *                 value: { message: "Invalid OTP code" }
 *               expired:
 *                 value: { message: "OTP expired or not issued" }
 *       401:
 *         description: Thiếu hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example:
 *               message: "Unauthorized"
 *       403:
 *         description: Người dùng không thuộc hợp đồng này
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example:
 *               message: "You are not allowed to verify this contract"
 *       404:
 *         description: Không tìm thấy hợp đồng
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example:
 *               message: "Contract not found"
 *       409:
 *         description: Bên này đã ký trước đó
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example:
 *               message: "You have already signed this contract"
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

// Staff/Admin gửi OTP
router.post("/staff/contracts/send-otp",isStaff, authenticateToken, sendContractOtp);

// Buyer/Seller xác nhận OTP
router.post("/contracts/verify-otp",isStaff, authenticateToken, verifyContractOtp);

export default router;
