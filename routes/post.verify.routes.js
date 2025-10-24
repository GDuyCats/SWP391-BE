// routes/post.verify.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import isStaffOrAdmin from "../middleware/isStaffAndAdmin.js";
import isStaff from "../middleware/isStaff.js";
import { getAllPosts, getPostDetail, verifyPost } from "../controller/admin.staff.post.verify.controller.js";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Posts (Verify)
 *     description: APIs dành cho Admin/Staff để liệt kê, xem chi tiết và duyệt bài
 */

/**
 * @openapi
 * /all:
 *   get:
 *     summary: List all posts for Admin/Staff
 *     description: |
 *       - **Admin**: thấy tất cả bài đăng.  
 *       - **Staff**: chỉ thấy các bài có `isActive = true`.  
 *       Trả về kèm thông tin người đăng (id, username, avatar, email) và các trường chính của bài (title, detail/content, price, category, verifyStatus, isActive, vipPriority).
 *     tags: [Posts (Verify)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bài đăng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer, example: 3 }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, example: 15 }
 *                       title: { type: string, example: "Xe điện ABC" }
 *                       detail: { type: string, example: "Mô tả chi tiết..." }
 *                       price: { type: number, example: 12900000 }
 *                       category: { type: string, enum: [battery, vehicle], example: "vehicle" }
 *                       verifyStatus: { type: string, enum: [verify, nonverify], example: "verify" }
 *                       isActive: { type: boolean, example: true }
 *                       isVip: { type: boolean, example: false }
 *                       vipPriority: { type: integer, example: 0 }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 *                       user:
 *                         type: object
 *                         properties:
 *                           id: { type: integer, example: 7 }
 *                           username: { type: string, example: "linh_nguyen" }
 *                           avatar: { type: string, example: "https://..." }
 *                           email: { type: string, example: "linh@example.com" }
 *       403:
 *         description: Không có quyền (chỉ Admin/Staff)
 *       500:
 *         description: Internal server error
 */
router.get("/all", authenticateToken, isStaffOrAdmin, getAllPosts);

/**
 * @openapi
 * /{id}/detail:
 *   get:
 *     summary: Get post detail for Admin/Staff
 *     description: |
 *       - **Admin**: xem chi tiết tất cả bài.  
 *       - **Staff**: chỉ xem chi tiết khi bài có `isActive = true`.  
 *       Trả về thông tin bài và user đăng bài.
 *     tags: [Posts (Verify)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID bài đăng
 *     responses:
 *       200:
 *         description: Chi tiết bài đăng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 15 }
 *                     title: { type: string, example: "Xe điện ABC" }
 *                     detail: { type: string, example: "Mô tả chi tiết..." }
 *                     price: { type: number, example: 12900000 }
 *                     category: { type: string, enum: [battery, vehicle], example: "vehicle" }
 *                     verifyStatus: { type: string, enum: [verify, nonverify], example: "nonverify" }
 *                     isActive: { type: boolean, example: true }
 *                     isVip: { type: boolean, example: false }
 *                     vipPriority: { type: integer, example: 0 }
 *                     createdAt: { type: string, format: date-time }
 *                     updatedAt: { type: string, format: date-time }
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: integer, example: 7 }
 *                         username: { type: string, example: "linh_nguyen" }
 *                         avatar: { type: string, example: "https://..." }
 *                         email: { type: string, example: "linh@example.com" }
 *       403:
 *         description: Không có quyền (hoặc Staff xem bài chưa active)
 *       404:
 *         description: Không tìm thấy bài đăng
 *       500:
 *         description: Internal server error
 */
router.get("/:id/detail", authenticateToken, isStaffOrAdmin, getPostDetail);

/**
 * @openapi
 * /{id}/verify:
 *   patch:
 *     summary: Staff/Admin verify or unverify a post
 *     description: |
 *       - **Admin**: có thể cập nhật `verifyStatus` cho tất cả bài.  
 *       - **Staff**: chỉ được cập nhật khi **bài `isActive = true`**.  
 *       - `verifyStatus` chỉ chấp nhận **"verify"** hoặc **"nonverify"**.
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
 *                 description: Trạng thái duyệt bài
 *           example:
 *             verifyStatus: verify
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái duyệt bài thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Cập nhật verifyStatus bài #15 thành 'verify' thành công" }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 15 }
 *                     verifyStatus: { type: string, enum: [verify, nonverify], example: "verify" }
 *                     isActive: { type: boolean, example: true }
 *       400:
 *         description: verifyStatus không hợp lệ
 *       403:
 *         description: Không có quyền (hoặc Staff duyệt bài chưa active)
 *       404:
 *         description: Không tìm thấy bài đăng
 *       500:
 *         description: Internal server error
 */
router.patch("/:id/verify", authenticateToken, isStaff, verifyPost);

export default router;
