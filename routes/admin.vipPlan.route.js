// routes/admin.plan.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import {
  createVipPlan,
  getAllVipPlans,
  toggleVipPlan,
  updateVipPlan,
  deleteVipPlan,
} from "../controller/admin.vipPlan.controller.js";
import isAdmin from "../middleware/isAdmin.js";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     VipPlan:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 1 }
 *         name: { type: string, example: "VIP 30 ngày" }
 *         slug:
 *           type: string
 *           description: Mã gói dùng để map sang vipTier của Post. Chỉ nhận: diamond, gold, silver.
 *           enum: [diamond, gold, silver]
 *           example: diamond
 *         description: { type: string, example: "Hiển thị ưu tiên trong 30 ngày" }
 *         type:
 *           type: string
 *           enum: [one_time, subscription]
 *           example: one_time
 *         amount:
 *           type: integer
 *           description: Giá gói (đơn vị nhỏ nhất), ví dụ VND.
 *           example: 99000
 *         currency:
 *           type: string
 *           description: Mã tiền tệ ISO-4217. Mặc định "vnd".
 *           example: "vnd"
 *         durationDays:
 *           type: integer
 *           nullable: true
 *           example: 30
 *           description: Bắt buộc khi type = one_time
 *         interval:
 *           type: string
 *           nullable: true
 *           enum: [day, week, month, year]
 *           example: "month"
 *           description: Bắt buộc khi type = subscription
 *         intervalCount:
 *           type: integer
 *           nullable: true
 *           minimum: 1
 *           example: 1
 *           description: Bắt buộc khi type = subscription
 *         stripeProductId: { type: string, nullable: true, example: "prod_123" }
 *         stripePriceId: { type: string, nullable: true, example: "price_123" }
 *         active: { type: boolean, example: true }
 *         priority:
 *           type: integer
 *           description: Mức ưu tiên hiển thị (1–9; số càng lớn càng ưu tiên).
 *           minimum: 1
 *           maximum: 9
 *           example: 3
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     CreateVipPlanRequest:
 *       oneOf:
 *         - title: One-time plan
 *           type: object
 *           required: [name, slug, type, amount, durationDays, priority]
 *           properties:
 *             name: { type: string, example: "VIP 60 ngày" }
 *             slug: { type: string, enum: [diamond, gold, silver], example: gold }
 *             description: { type: string, example: "Premium 60 ngày" }
 *             type: { type: string, enum: [one_time] }
 *             amount: { type: integer, example: 199000 }
 *             currency: { type: string, example: "vnd" }
 *             durationDays: { type: integer, minimum: 1, example: 60 }
 *             priority: { type: integer, minimum: 1, maximum: 9, example: 2 }
 *             active: { type: boolean, example: true }
 *         - title: Subscription plan
 *           type: object
 *           required: [name, slug, type, amount, interval, intervalCount, priority]
 *           properties:
 *             name: { type: string, example: "VIP Monthly" }
 *             slug: { type: string, enum: [diamond, gold, silver], example: diamond }
 *             description: { type: string, example: "Gia hạn theo tháng" }
 *             type: { type: string, enum: [subscription] }
 *             amount: { type: integer, example: 149000 }
 *             currency: { type: string, example: "vnd" }
 *             interval: { type: string, enum: [day, week, month, year], example: "month" }
 *             intervalCount: { type: integer, minimum: 1, example: 1 }
 *             priority: { type: integer, minimum: 1, maximum: 9, example: 3 }
 *             active: { type: boolean, example: true }
 */

/**
 * @swagger
 * /admin/vip-plans:
 *   post:
 *     tags: [Admin manage Plan]
 *     summary: Create a new VIP plan
 *     security:
 *       - bearerAuth: []
 *     description: Tạo gói one-time hoặc subscription. Hệ thống sẽ tạo Stripe Product & Price (nếu cấu hình) rồi lưu khóa tham chiếu lại.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVipPlanRequest'
 *     responses:
 *       201:
 *         description: Plan created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 plan: { $ref: '#/components/schemas/VipPlan' }
 *       400: { description: Bad request (validation) }
 *       401: { description: Unauthorized }
 *       403: { description: Admin only }
 *       500: { description: Create plan failed }
 */
router.post("/vip-plans", authenticateToken, isAdmin, createVipPlan);

/**
 * @swagger
 * /admin/vip-plans:
 *   get:
 *     tags: [Admin manage Plan]
 *     summary: List all VIP plans (active and inactive)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: [true, false] }
 *         required: false
 *         description: Lọc theo trạng thái active (nếu cần)
 *     responses:
 *       200:
 *         description: Plans fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 plans:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/VipPlan' }
 *       401: { description: Unauthorized }
 *       403: { description: Admin only }
 */
router.get("/vip-plans", authenticateToken, isAdmin, getAllVipPlans);

/**
 * @swagger
 * /admin/vip-plans/{id}:
 *   patch:
 *     tags: [Admin manage Plan]
 *     summary: Update a VIP plan
 *     security:
 *       - bearerAuth: []
 *     description: Cập nhật các trường của plan. Nếu thay đổi amount/currency/interval/intervalCount, hệ thống có thể tạo Stripe Price mới và liên kết.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "VIP 45 ngày" }
 *               description: { type: string, example: "Gói 45 ngày ưu tiên" }
 *               active: { type: boolean, example: true }
 *               priority: { type: integer, minimum: 1, maximum: 9, example: 2 }
 *               slug: { type: string, enum: [diamond, gold, silver], example: silver }
 *               amount: { type: integer, example: 129000 }
 *               currency: { type: string, example: "vnd" }
 *               durationDays: { type: integer, example: 45 }
 *               interval: { type: string, enum: [day, week, month, year], example: "month" }
 *               intervalCount: { type: integer, minimum: 1, example: 1 }
 *     responses:
 *       200:
 *         description: Plan updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 plan: { $ref: '#/components/schemas/VipPlan' }
 *       401: { description: Unauthorized }
 *       403: { description: Admin only }
 *       404: { description: Plan not found }
 *       500: { description: Update plan failed }
 */
router.patch("/vip-plans/:id", authenticateToken, isAdmin, updateVipPlan);

/**
 * @swagger
 * /admin/vip-plans/{id}:
 *   delete:
 *     tags: [Admin manage Plan]
 *     summary: Soft delete (deactivate) a VIP plan
 *     security:
 *       - bearerAuth: []
 *     description: Đặt `active=false` (giữ lịch sử). Có thể cố gắng deactivate Stripe Price tương ứng.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Plan deactivated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 message: { type: string, example: "Plan deactivated" }
 *                 plan: { $ref: '#/components/schemas/VipPlan' }
 *       401: { description: Unauthorized }
 *       403: { description: Admin only }
 *       404: { description: Plan not found }
 *       500: { description: Delete plan failed }
 */
router.delete("/vip-plans/:id", authenticateToken, isAdmin, deleteVipPlan);

/**
 * @swagger
 * /admin/vip-plans/{id}/toggle:
 *   patch:
 *     tags: [Admin manage Plan]
 *     summary: Toggle plan active status
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [active]
 *             properties:
 *               active: { type: boolean, example: false }
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Plan toggled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 plan: { $ref: '#/components/schemas/VipPlan' }
 *       401: { description: Unauthorized }
 *       403: { description: Admin only }
 *       404: { description: Plan not found }
 */
router.patch("/vip-plans/:id/toggle", authenticateToken, isAdmin, toggleVipPlan);

export default router;
