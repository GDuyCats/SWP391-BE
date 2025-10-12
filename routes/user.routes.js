import { Router } from "express";
import { profileController, updateMyProfile } from "../controller/user.controller.js";
import authenticateToken from "../middleware/authenticateToken.js";

const router = Router();

/**
 * @openapi
 * /profile:
 *   post:
 *     summary: Get the authenticated user's profile information
 *     tags: [User]
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
router.post("/profile", authenticateToken, profileController);

/**
 * @openapi
 * /profile/update:
 *   patch:
 *     summary: Update the authenticated user's profile
 *     tags: [User]
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
router.patch("/profile/update", authenticateToken, updateMyProfile);

export default router;
