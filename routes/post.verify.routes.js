// routes/post.verify.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import isStaffOrAdmin from "../middleware/isStaffAndAdmin.js";
import isStaff from "../middleware/isStaff.js";
import {
  getAllPosts,
  getPostDetail,
  verifyPost,
  deletePost, // ⬅️ THÊM IMPORT NÀY
} from "../controller/admin.staff.post.verify.controller.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Posts (Verify)
 *     description: APIs dành cho Admin/Staff để liệt kê, xem chi tiết và duyệt bài
 */

/**
 * @openapi
 * /admin/all:
 *   get:
 *     summary: List all posts for Admin/Staff
 *     description: |
 *       - **Admin**: thấy tất cả bài đăng.  
 *       - **Staff**: chỉ thấy các bài có `isActive = true`.  
 *     tags: [Posts (Verify)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bài đăng
 *       403:
 *         description: Không có quyền (chỉ Admin/Staff)
 *       500:
 *         description: Internal server error
 */
router.get("/all", authenticateToken, isStaffOrAdmin, getAllPosts);

/**
 * @openapi
 * /admin/{id}/detail:
 *   get:
 *     summary: Get post detail for Admin/Staff
 *     description: |
 *       - **Admin**: xem chi tiết tất cả bài.  
 *       - **Staff**: chỉ xem chi tiết khi bài có `isActive = true`.  
 *     tags: [Posts (Verify)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200: { description: Chi tiết bài đăng }
 *       403: { description: Không có quyền }
 *       404: { description: Không tìm thấy bài đăng }
 *       500: { description: Internal server error }
 */
router.get("/:id/detail", authenticateToken, isStaffOrAdmin, getPostDetail);

/**
 * @openapi
 * /admin/{id}/verify:
 *   patch:
 *     summary: Staff/Admin verify or unverify a post
 *     description: |
 *       - **Admin**: cập nhật `verifyStatus` cho tất cả bài.  
 *       - **Staff**: chỉ cập nhật được khi bài `isActive = true`.  
 *     tags: [Posts (Verify)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *     responses:
 *       200: { description: Cập nhật verifyStatus thành công }
 *       400: { description: verifyStatus không hợp lệ }
 *       403: { description: Không có quyền }
 *       404: { description: Không tìm thấy bài đăng }
 *       500: { description: Internal server error }
 */
router.patch("/:id/verify", authenticateToken, isStaffOrAdmin, verifyPost);

/**
 * @openapi
 * /admin/{id}/delete:
 *   delete:
 *     summary: Admin delete a post permanently
 *     description: |
 *       - **Admin**: Xóa **vĩnh viễn** khỏi DB.
 *       - **Staff**: không có quyền xóa.
 *     tags: [Posts (Verify)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa bài đăng thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa bài đăng #15 thành công"
 *       403:
 *         description: Không có quyền (chỉ Admin)
 *       404:
 *         description: Không tìm thấy bài đăng
 *       500:
 *         description: Internal Server Error
 */
router.delete("/:id/delete", authenticateToken, isStaffOrAdmin, deletePost);

export default router;
