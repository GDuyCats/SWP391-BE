// routes/user.routes.js
import { Router } from "express";
import { profileController, updateMyProfile } from "../controller/user.controller.js";
import { getMyPurchases } from "../controller/user.controller.js";
import authenticateToken from "../middleware/authenticateToken.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile & purchase management
 */

/**
 * @swagger
 * /profile/me:
 *   post:
 *     summary: Get the authenticated user's profile information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/me", authenticateToken, profileController);

/**
 * @swagger
 * /profile/update:
 *   patch:
 *     summary: Update the authenticated user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               fullname:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 example: NewStrongP@ssword
 *               phone:
 *                 type: string
 *                 example: 0909123456
 *               bio:
 *                 type: string
 *                 example: Passionate about green energy and EVs
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Upload profile avatar image
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.patch("/update", authenticateToken, updateMyProfile);

/**
 * @swagger
 * /profile/purchases:
 *   get:
 *     summary: Get the authenticated user's purchase history
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve a paginated list of the user's VIP purchase transactions.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 10 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PAID, CANCELED, REFUNDED]
 *       - in: query
 *         name: provider
 *         schema: { type: string, example: stripe }
 *     responses:
 *       200:
 *         description: List of purchase transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                   example: 3
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, example: 12 }
 *                       orderCode: { type: string, example: VIP1712345678901 }
 *                       amount: { type: integer, example: 99000 }
 *                       status: { type: string, example: PAID }
 *                       provider: { type: string, example: stripe }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/purchases", authenticateToken, getMyPurchases);

export default router;
