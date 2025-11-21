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
 *     CreateVipPlanRequest:
 *       type: object
 *       required:
 *         - name
 *         - type
 *         - amount
 *         - priority
 *         - slug
 *       properties:
 *         name:
 *           type: string
 *           description: Tên gói VIP hiển thị cho user.
 *           example: "Diamond 30 days"
 *         description:
 *           type: string
 *           description: Mô tả chi tiết về quyền lợi của gói.
 *           example: "Top priority posts in listing, highlight badge, more impressions."
 *         type:
 *           type: string
 *           description: Loại gói. "one_time" dùng cho gói theo số ngày, "subscription" dùng cho gói dạng subscription Stripe.
 *           enum: [one_time, subscription]
 *           example: "one_time"
 *         amount:
 *           type: integer
 *           format: int64
 *           description: >
 *             Số tiền phải > 0 (đơn vị nhỏ nhất của currency, với VND là số tiền đúng luôn, ví dụ 99000).
 *           example: 99000
 *         currency:
 *           type: string
 *           description: Mã tiền tệ theo Stripe, mặc định là "vnd".
 *           example: "vnd"
 *         durationDays:
 *           type: integer
 *           minimum: 1
 *           nullable: true
 *           description: >
 *             Bắt buộc khi type = "one_time".
 *             Số ngày hiệu lực của gói kể từ lúc mua.
 *           example: 30
 *         interval:
 *           type: string
 *           nullable: true
 *           description: >
 *             Bắt buộc khi type = "subscription".
 *             Khoảng thời gian lặp lại của subscription Stripe.
 *           enum: [day, week, month, year]
 *           example: "month"
 *         intervalCount:
 *           type: integer
 *           minimum: 1
 *           nullable: true
 *           description: >
 *             Bắt buộc khi type = "subscription".
 *             Số interval cho mỗi lần thanh toán (ví dụ: 1 month, 3 months, ...).
 *           example: 1
 *         priority:
 *           type: integer
 *           minimum: 1
 *           maximum: 9
 *           description: >
 *             Thứ tự ưu tiên (1 là ưu tiên cao hơn 2, ...).
 *             Bắt buộc, phải là số nguyên 1–9. Controller reject nếu >= 10.
 *           example: 1
 *         slug:
 *           type: string
 *           description: >
 *             Tier slug cho gói.
 *             Controller sẽ normalize slug (toTierSlug) và kiểm tra phải thuộc danh sách ALLOWED_TIERS.
 *           enum: [diamond, gold, silver]
 *           example: "diamond"
 *
 *     VipPlan:
 *       type: object
 *       description: Thông tin gói VIP lưu trong database.
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Diamond 30 days"
 *         description:
 *           type: string
 *           example: "Top priority posts in listing, highlight badge, more impressions."
 *         type:
 *           type: string
 *           enum: [one_time, subscription]
 *           example: "one_time"
 *         amount:
 *           type: integer
 *           format: int64
 *           example: 99000
 *         currency:
 *           type: string
 *           example: "vnd"
 *         durationDays:
 *           type: integer
 *           nullable: true
 *           example: 30
 *         interval:
 *           type: string
 *           nullable: true
 *           example: "month"
 *         intervalCount:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         stripeProductId:
 *           type: string
 *           description: ID product trên Stripe.
 *           example: "prod_Qabc123xyz"
 *         stripePriceId:
 *           type: string
 *           description: ID price trên Stripe.
 *           example: "price_1PxyzAbc123"
 *         active:
 *           type: boolean
 *           description: Gói đang được sử dụng hay đã tắt.
 *           example: true
 *         priority:
 *           type: integer
 *           example: 1
 *         slug:
 *           type: string
 *           enum: [diamond, gold, silver]
 *           example: "diamond"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-11-21T10:15:30.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-11-21T10:15:30.000Z"
 */


/**
 * @swagger
 * /admin/vip-plans:
 *   post:
 *     tags: [Admin manage Plan]
 *     summary: Create a new VIP plan
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Create a VIP plan of type **one_time** or **subscription**.
 *       The system will create a Stripe Product & Price first, then save the reference
 *       (stripeProductId, stripePriceId) into the database along with plan metadata.
 *
 *       **Validation rules:**
 *       - `name`, `type`, `amount`, `priority`, `slug` are required.
 *       - `amount` must be > 0 (VND).
 *       - `priority` must be an integer from 1 to 9.
 *       - `slug` must be one of: `diamond`, `gold`, `silver`.
 *       - If `type = "one_time"`: `durationDays` is required and must be integer ≥ 1.
 *       - If `type = "subscription"`: `interval` and `intervalCount` are required and `intervalCount` must be integer ≥ 1.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVipPlanRequest'
 *     responses:
 *       201:
 *         description: Plan created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 plan:
 *                   $ref: '#/components/schemas/VipPlan'
 *       400:
 *         description: Validation error (missing fields, invalid type, duplicate slug, etc.)
 *       401:
 *         description: Unauthorized (missing or invalid bearer token)
 *       403:
 *         description: Forbidden (admin only)
 *       500:
 *         description: Internal server error while creating plan
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
