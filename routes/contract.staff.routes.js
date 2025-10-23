// routes/contract.staff.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { recordAppointment, finalizeNegotiation } from "../controller/contract.controller.js";
import isStaff from "../middleware/isStaff.js";

const router = Router();

/**
 * @swagger
 * /staff/contracts/appointment:
 *   post:
 *     summary: Staff ghi nhận lịch hẹn giữa buyer và seller
 *     description: >
 *       Staff tạo lịch hẹn xem xe hoặc gặp mặt cho hợp đồng đang ở trạng thái **pending** hoặc **negotiating**.
 *       Lưu thông tin thời gian, địa điểm và ghi chú vào contract.
 *     tags: [Contracts - Staff]
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
 *               - appointmentTime
 *               - appointmentPlace
 *             properties:
 *               contractId:
 *                 type: integer
 *                 example: 8
 *               appointmentTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-10-19T09:30:00Z"
 *               appointmentPlace:
 *                 type: string
 *                 example: "Showroom Toyota, Quận 7"
 *               appointmentNote:
 *                 type: string
 *                 example: "Buyer sẽ mang theo người thân để xem xe."
 *     responses:
 *       200:
 *         description: Ghi nhận lịch hẹn thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Appointment recorded successfully
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Dữ liệu đầu vào sai hoặc contract không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidStatus:
 *                 value: { message: "Cannot record appointment for this contract status." }
 *       403:
 *         description: Chỉ staff hoặc admin được phép thực hiện
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Only staff or admin can record appointments."
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

/**
 * @swagger
 * /staff/contracts/finalize:
 *   post:
 *     summary: Staff chốt thương lượng và hoàn tất giai đoạn thương lượng
 *     description: >
 *       Staff nhập giá đã thống nhất và phần trăm phí của buyer/seller.
 *       Khi chốt xong, trạng thái contract chuyển sang **awaiting_sign**.
 *     tags: [Contracts - Staff]
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
 *               - agreedPrice
 *             properties:
 *               contractId:
 *                 type: integer
 *                 example: 8
 *               agreedPrice:
 *                 type: number
 *                 format: float
 *                 example: 425000000
 *               buyerFeePercent:
 *                 type: number
 *                 format: float
 *                 example: 3
 *               sellerFeePercent:
 *                 type: number
 *                 format: float
 *                 example: 2
 *               notes:
 *                 type: string
 *                 example: "Hai bên thống nhất giữ giá 425 triệu."
 *     responses:
 *       200:
 *         description: Hoàn tất thương lượng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Negotiation finalized successfully
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *       400:
 *         description: Dữ liệu không hợp lệ (giá hoặc trạng thái)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidStatus:
 *                 value: { message: "Cannot finalize negotiation for this contract status." }
 *               invalidPrice:
 *                 value: { message: "Invalid agreed price." }
 *       403:
 *         description: Chỉ staff hoặc admin được phép thực hiện
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Only staff or admin can finalize negotiation."
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

// Staff ghi nhận lịch hẹn
router.post("/appointment",isStaff, authenticateToken, recordAppointment);
router.post("/finalize",isStaff, authenticateToken, finalizeNegotiation);
export default router;
