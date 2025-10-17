// routes/post.verify.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { getAllPosts, verifyPost } from "../controller/admin.staff.post.verify.controller.js";
import isStaff from "../middleware/isStaff.js";
import isStaffOrAdmin from "../middleware/isStaffAndAdmin.js";

const router = Router();

/**
 * @openapi
 * /posts/{id}/verify:
 *   patch:
 *     summary: Staff verify or unverify a post
 *     description: Chỉ admin hoặc staff mới có thể cập nhật trạng thái duyệt bài. Field `verifyStatus` chỉ chấp nhận `"verify"` hoặc `"nonverify"`.
 *     tags: [Posts (Verify)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của bài đăng cần duyệt
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verifyStatus
 *             properties:
 *               verifyStatus:
 *                 type: string
 *                 enum: [verify, nonverify]
 *                 description: Trạng thái duyệt bài ("verify" hoặc "nonverify")
 *           example:
 *             verifyStatus: verify
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái duyệt bài thành công
 *       400:
 *         description: verifyStatus không hợp lệ
 *       403:
 *         description: Người dùng không có quyền duyệt bài
 *       404:
 *         description: Không tìm thấy bài đăng
 *       500:
 *         description: Lỗi server nội bộ
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
