// routes/staff.contract.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import {
  recordAppointment,
  finalizeNegotiation,
  listStaffContracts,
  sendFinalContractToParties,
  sendDraftContractToParties,
} from "../controller/contract.controller.js";
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
 *       400:
 *         description: Dữ liệu đầu vào sai hoặc contract không hợp lệ
 *       403:
 *         description: Chỉ staff hoặc admin được phép thực hiện
 *       404:
 *         description: Không tìm thấy hợp đồng
 *       500:
 *         description: Lỗi máy chủ
 */

/**
 * @swagger
 * /staff/contracts/finalize:
 *   post:
 *     summary: Staff chốt thương lượng và hoàn tất giai đoạn thương lượng
 *     description: >
 *       Staff nhập **giá đã thống nhất** và các **loại phí chi tiết** (nếu có).  
 *       Khi chốt xong, trạng thái contract chuyển sang **awaiting_sign** để chờ ký OTP.
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
 *                 example: 425000000
 *               brokerageFee:
 *                 type: number
 *                 example: 500000
 *                 description: Phí môi giới giao dịch
 *               titleTransferFee:
 *                 type: number
 *                 example: 200000
 *                 description: Phí làm hồ sơ sang tên – đăng ký
 *               legalAndConditionCheckFee:
 *                 type: number
 *                 example: 150000
 *                 description: Phí kiểm tra pháp lý & tình trạng xe
 *               adminProcessingFee:
 *                 type: number
 *                 example: 100000
 *                 description: Phí xử lý giấy tờ & hành chính
 *               reinspectionOrRegistrationSupportFee:
 *                 type: number
 *                 example: 300000
 *                 description: Phí kiểm định / hỗ trợ đăng kiểm lại
 *               note:
 *                 type: string
 *                 example: "Hai bên thống nhất giữ giá 425 triệu, có hỗ trợ phí sang tên."
 *     responses:
 *       200:
 *         description: Hoàn tất thương lượng thành công
 *       400:
 *         description: Dữ liệu không hợp lệ (giá hoặc trạng thái)
 *       403:
 *         description: Chỉ staff hoặc admin được phép thực hiện
 *       404:
 *         description: Không tìm thấy hợp đồng
 *       500:
 *         description: Lỗi máy chủ
 */

/**
 * @swagger
 * /staff/contracts/send-draft:
 *   post:
 *     summary: Staff gửi hợp đồng dự thảo cho Buyer và Seller để xem trước khi ký
 *     description: >
 *       Staff phụ trách có thể gửi **bản hợp đồng dự thảo (preview)** đến **buyer** và **seller**  
 *       để hai bên xem và kiểm tra lại nội dung trước khi ký OTP.  
 *       Áp dụng khi contract đang ở trạng thái **awaiting_sign**.
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
 *             properties:
 *               contractId:
 *                 type: integer
 *                 example: 8
 *     responses:
 *       200:
 *         description: Gửi hợp đồng dự thảo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Draft contract sent to buyer and seller successfully.
 *                 status:
 *                   type: string
 *                   example: awaiting_sign
 *                 sentTo:
 *                   type: object
 *                   properties:
 *                     buyerEmail:
 *                       type: string
 *                       example: buyer@example.com
 *                     sellerEmail:
 *                       type: string
 *                       example: seller@example.com
 *       400:
 *         description: Trạng thái không phù hợp để gửi nháp hoặc thiếu dữ liệu
 *       401:
 *         description: Thiếu/sai token
 *       403:
 *         description: Không phải staff phụ trách hợp đồng này
 *       404:
 *         description: Không tìm thấy hợp đồng
 *       500:
 *         description: Lỗi máy chủ
 */

/**
 * @swagger
 * /staff/contracts/send-final:
 *   post:
 *     summary: Staff gửi hợp đồng cuối cùng (đã ký) cho Buyer và Seller
 *     description: >
 *       Khi cả Buyer và Seller đã ký OTP và trạng thái contract là **signed**,  
 *       staff phụ trách hợp đồng có thể gửi email bản tóm tắt hợp đồng cho cả hai bên.  
 *       Sau khi gửi thành công, trạng thái hợp đồng chuyển sang **completed**.
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
 *             properties:
 *               contractId:
 *                 type: integer
 *                 example: 8
 *     responses:
 *       200:
 *         description: Gửi hợp đồng hoàn tất thành công
 *       400:
 *         description: Chưa đủ điều kiện gửi (chưa signed đủ 2 bên)
 *       401:
 *         description: Thiếu hoặc sai token
 *       403:
 *         description: Staff không phải người được assign vào hợp đồng này
 *       404:
 *         description: Không tìm thấy hợp đồng
 *       500:
 *         description: Lỗi máy chủ
 */

/**
 * @swagger
 * /staff/contracts/allContracts:
 *   get:
 *     summary: Staff xem các contract đã được assign
 *     description: >
 *       Trả về danh sách các hợp đồng mà staff hiện tại (hoặc admin) đang phụ trách.
 *     tags: [Contracts - Staff]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách hợp đồng của staff
 *       401:
 *         description: Thiếu token / token không hợp lệ
 *       403:
 *         description: Chỉ staff hoặc admin mới được xem danh sách này
 *       500:
 *         description: Lỗi máy chủ
 */

// ================= ROUTES =================

// Staff ghi nhận lịch hẹn
router.post("/appointment", authenticateToken, isStaff, recordAppointment);

// Staff chốt thương lượng
router.post("/finalize", authenticateToken, isStaff, finalizeNegotiation);

// Staff gửi hợp đồng dự thảo cho buyer & seller để xem trước khi ký
router.post("/send-draft", authenticateToken, isStaff, sendDraftContractToParties);

// Staff gửi hợp đồng cuối cùng cho buyer & seller (chuyển trạng thái -> completed)
router.post("/send-final", authenticateToken, isStaff, sendFinalContractToParties);

// Staff xem danh sách hợp đồng được assign
router.get("/allContracts", authenticateToken, isStaff, listStaffContracts);

export default router;
