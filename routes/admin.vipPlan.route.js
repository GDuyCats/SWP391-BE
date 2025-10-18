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
 *         name: { type: string, example: "VIP 30 days" }
 *         slug: { type: string, example: "vip-30-days" }
 *         description: { type: string, example: "Unlock premium features." }
 *         type:
 *           type: string
 *           enum: [one_time, subscription]
 *           example: one_time
 *         amount: { type: integer, example: 99000 }
 *         currency:
 *           type: string
 *           description: ISO currency (khuyến nghị UPPERCASE)
 *           example: "VND"
 *         durationDays:
 *           type: integer
 *           nullable: true
 *           example: 30
 *           description: Chỉ dùng khi type = one_time
 *         interval:
 *           type: string
 *           nullable: true
 *           enum: [day, week, month, year]
 *           example: "month"
 *           description: Chỉ dùng khi type = subscription
 *         intervalCount:
 *           type: integer
 *           nullable: true
 *           minimum: 1
 *           example: 1
 *           description: Chỉ dùng khi type = subscription
 *         stripeProductId: { type: string, example: "prod_123" }
 *         stripePriceId: { type: string, example: "price_123" }
 *         active: { type: boolean, example: true }
 *         priority: { type: integer, example: 10 }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *
 *     CreateVipPlanRequest:
 *       oneOf:
 *         - title: One-time plan
 *           type: object
 *           required: [name, type, amount]
 *           properties:
 *             name: { type: string, example: "VIP 60 days" }
 *             description: { type: string, example: "Premium 60 ngày" }
 *             type:
 *               type: string
 *               enum: [one_time]
 *             amount: { type: integer, example: 199000 }
 *             currency: { type: string, example: "VND" }
 *             durationDays:
 *               type: integer
 *               example: 60
 *             priority: { type: integer, example: 20 }
 *             active: { type: boolean, example: true }
 *             slug:
 *               type: string
 *               example: "vip-60-days"
 *         - title: Subscription plan
 *           type: object
 *           required: [name, type, amount, interval, intervalCount]
 *           properties:
 *             name: { type: string, example: "VIP Monthly" }
 *             description: { type: string, example: "Gia hạn theo tháng" }
 *             type:
 *               type: string
 *               enum: [subscription]
 *             amount: { type: integer, example: 99000 }
 *             currency: { type: string, example: "VND" }
 *             interval:
 *               type: string
 *               enum: [day, week, month, year]
 *               example: "month"
 *             intervalCount:
 *               type: integer
 *               minimum: 1
 *               example: 1
 *             priority: { type: integer, example: 10 }
 *             active: { type: boolean, example: true }
 *             slug:
 *               type: string
 *               example: "vip-monthly"
 */

/**
 * @swagger
 * /admin/vip-plans:
 *   post:
 *     tags: [Admin manage Plan]
 *     summary: Create a new VIP plan
 *     security:
 *       - bearerAuth: []
 *     description: Tạo gói one-time hoặc subscription. Hệ thống sẽ tạo Stripe Product & Price và lưu lại khóa tham chiếu.
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
 *       400: { description: Bad request (validation)" }
 *       401: { description: Unauthorized }
 *       403: { description: Admin only }
 *       500: { description: Create plan failed }
 */
router.post("/vip-plans", authenticateToken, isAdmin, createVipPlan);

/**
 * @swagger
 * /admin/vip-plans:
 *   get:
 *     summary: List all VIP plans (active and inactive)
 *     tags: [Admin manage Plan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: [true, false] }
 *         required: false
 *         description: Lọc theo trạng thái active.
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
 *     summary: Update a VIP plan
 *     tags: [Admin manage Plan]
 *     security:
 *       - bearerAuth: []
 *     description: Cập nhật trường của plan. Nếu thay đổi amount/currency/interval/intervalCount, hệ thống có thể tạo Stripe Price mới và liên kết.
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
 *               name: { type: string, example: "VIP 45 days" }
 *               description: { type: string }
 *               active: { type: boolean, example: true }
 *               priority: { type: integer, example: 15 }
 *               amount: { type: integer, example: 129000 }
 *               currency: { type: string, example: "VND" }
 *               durationDays: { type: integer, example: 45 }
 *               interval: { type: string, enum: [day, week, month, year], example: "month" }
 *               intervalCount: { type: integer, minimum: 1, example: 1 }
 *               slug: { type: string, example: "vip-45-days" }
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
 *     summary: Soft delete (deactivate) a VIP plan
 *     tags: [Admin manage Plan]
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
 *     summary: Toggle plan active status
 *     tags: [Admin manage Plan]
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
