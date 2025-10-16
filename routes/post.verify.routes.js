// routes/post.verify.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { getAllPosts, verifyPost } from "../controller/admin.staff.post.verify.controller.js";
import isStaff from "../middleware/isStaff.js";
import isStaffOrAdmin from "../middleware/isStaffAndAdmin.js";

const router = Router();

/**
 * @openapi
 * /{id}/verify:
 *   patch:
 *     summary: Staff verify a post
 *     tags: [Posts (Verify)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the post to verify
 *     responses:
 *       200:
 *         description: Post verified successfully
 *       403:
 *         description: Forbidden - user is not authorized
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/verify", authenticateToken, isStaff, verifyPost);

/**
 * @openapi
 * /all:
 *   get:
 *     summary: Get all posts for staff or admin
 *     tags: [Posts (Verify)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved all posts
 *       403:
 *         description: Forbidden - user is not authorized
 *       500:
 *         description: Internal server error
 */
router.get("/all", authenticateToken, isStaffOrAdmin, getAllPosts);

export default router;
