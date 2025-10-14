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
 *         description: { type: string, example: "Unlock premium features for 30 days." }
 *         type:
 *           type: string
 *           enum: [one_time, subscription]
 *           example: one_time
 *         amount: { type: integer, example: 99000 }
 *         currency: { type: string, example: "vnd" }
 *         durationDays: { type: integer, nullable: true, example: 30 }
 *         interval: { type: string, nullable: true, example: "month" }
 *         intervalCount: { type: integer, nullable: true, example: 1 }
 *         stripeProductId: { type: string, example: "prod_123" }
 *         stripePriceId: { type: string, example: "price_123" }
 *         active: { type: boolean, example: true }
 */

/**
 * @swagger
 * /admin/vip-plans:
 *   post:
 *     summary: Create a new VIP plan
 *     tags: [Admin manage Plan]
 *     security:
 *       - bearerAuth: []
 *     description: Create a one-time or subscription VIP plan. Will create Stripe Product & Price and store references.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, amount]
 *             properties:
 *               name: { type: string, example: "VIP 30 days" }
 *               description: { type: string, example: "Premium posting limit for 30 days." }
 *               type:
 *                 type: string
 *                 enum: [one_time, subscription]
 *                 example: one_time
 *               amount: { type: integer, example: 99000 }
 *               currency: { type: string, example: "vnd" }
 *               # one-time only
 *               durationDays: { type: integer, example: 30 }
 *               # subscription only
 *               interval: { type: string, example: "month" }
 *               intervalCount: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: Plan created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 plan: { $ref: '#/components/schemas/VipPlan' }
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
 *     description: Returns every plan. Optionally filter by query `?active=true|false`.
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: string, enum: [true, false] }
 *         required: false
 *         description: Filter by active status.
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
 *     description: Updates plan fields. If amount/currency/interval changes, a new Stripe Price will be created and linked.
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
 *               active: { type: boolean }
 *               amount: { type: integer, example: 129000 }
 *               currency: { type: string, example: "vnd" }
 *               durationDays: { type: integer, example: 45 }
 *               interval: { type: string, example: "month" }
 *               intervalCount: { type: integer, example: 1 }
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
 *     description: Sets `active=false` and attempts to deactivate the Stripe Price (when supported). Keeps historical data.
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
 *     description: Quickly enable/disable a plan by toggling its `active` flag.
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
 *             required: [active]
 *             properties:
 *               active: { type: boolean, example: false }
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
