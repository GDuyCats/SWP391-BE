// routes/contract.admin.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { assignStaffToContract, listAllContractsForAdmin } from "../controller/contract.controller.js";
import isAdmin from "../middleware/isAdmin.js";

const router = Router();
/**
 * @swagger
 * /admin/contracts/assign-staff:
 *   post:
 *     summary: Admin gán nhân viên (staff) phụ trách hợp đồng
 *     description: >
 *       Admin dùng API này để gán một staff cho hợp đồng ở trạng thái **pending** hoặc **negotiating**.  
 *       Sau khi gán, staff đó sẽ là người phụ trách toàn bộ quá trình thương lượng, hẹn gặp và ký hợp đồng.
 *     tags: [Contracts - Admin]
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
 *               - staffId
 *             properties:
 *               contractId:
 *                 type: integer
 *                 description: ID của hợp đồng cần gán staff
 *                 example: 12
 *               staffId:
 *                 type: integer
 *                 description: ID của nhân viên được gán
 *                 example: 5
 *     responses:
 *       200:
 *         description: Gán staff thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Staff assigned successfully
 *                 contract:
 *                   $ref: '#/components/schemas/Contract'
 *             examples:
 *               ok:
 *                 summary: Thành công
 *                 value:
 *                   message: "Staff assigned successfully"
 *                   contract:
 *                     id: 12
 *                     buyerId: 8
 *                     sellerId: 4
 *                     staffId: 5
 *                     status: "negotiating"
 *                     updatedAt: "2025-10-16T13:22:00Z"
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc contract không thể gán
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missing:
 *                 value: { message: "Missing contractId or staffId" }
 *               invalidStatus:
 *                 value: { message: "Cannot assign staff for this contract status." }
 *       401:
 *         description: Thiếu hoặc token không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Unauthorized"
 *       403:
 *         description: Không đủ quyền (chỉ admin được phép)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Only admin can assign staff to contracts."
 *       404:
 *         description: Không tìm thấy hợp đồng hoặc staff
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               contractNotFound:
 *                 value: { message: "Contract not found" }
 *               staffNotFound:
 *                 value: { message: "Staff not found" }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

// Admin gán staff cho hợp đồng
router.post("/assign-staff" , authenticateToken,isAdmin, assignStaffToContract);
/**
 * @openapi
 * /contracts/admin:
 *   get:
 *     summary: Admin xem toàn bộ contract
 *     tags: [Contracts]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/allContract",
  authenticateToken,
  isAdmin,           // chỉ admin mới gọi được
  listAllContractsForAdmin
);
export default router;
