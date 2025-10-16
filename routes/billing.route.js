import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import {
  listActivePlans,
  checkoutFromPlan,
} from "../controller/billing.plan.controller.js";

const router = Router();

/**
 * @swagger
 * /plans:
 *   get:
 *     summary: Get all active VIP plans
 *     tags: [Plan & Checkout]
 *     description: Retrieve a list of all active VIP subscription or one-time plans available for users to purchase.
 *     responses:
 *       200:
 *         description: List of available VIP plans.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 plans:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: VIP 30 days
 *                       description:
 *                         type: string
 *                         example: Get VIP access for 30 days and unlock premium features.
 *                       amount:
 *                         type: integer
 *                         example: 99000
 *                       currency:
 *                         type: string
 *                         example: vnd
 *                       type:
 *                         type: string
 *                         enum: [one_time, subscription]
 *                         example: one_time
 *                       durationDays:
 *                         type: integer
 *                         example: 30
 *                       interval:
 *                         type: string
 *                         example: month
 *                       intervalCount:
 *                         type: integer
 *                         example: 1
 *                       active:
 *                         type: boolean
 *                         example: true
 */

/**
 * @swagger
 * /plans-checkout:
 *   post:
 *     summary: Create a Stripe checkout session for the selected VIP plan
 *     tags: [Plan & Checkout]
 *     description: Allows an authenticated user to create a Stripe Checkout session based on the selected VIP plan (by planId).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: integer
 *                 example: 1
 *                 description: The ID of the VIP plan to purchase.
 *     responses:
 *       200:
 *         description: Stripe Checkout session URL successfully created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 url:
 *                   type: string
 *                   example: https://checkout.stripe.com/c/pay/cs_test_a1b2c3
 *                 orderCode:
 *                   type: string
 *                   example: VIP1697362823927
 *       401:
 *         description: Unauthorized. Missing or invalid token.
 *       404:
 *         description: Plan not found or inactive.
 *       500:
 *         description: Internal server error during checkout creation.
 */

router.get("/", listActivePlans);
router.post("/checkout", authenticateToken, checkoutFromPlan);

export default router;
