import { Router } from "express";
import multer from "multer";
import authenticateToken from "../middleware/authenticateToken.js";
import {
  createMyPost,
  updateMyPost,
  deleteMyPost,
  getMyPosts,
  getUserPosts,
  updateMyPostSaleStatus, // 👈 NEW
} from "../controller/user.post.controller.js";
import { enforcePostQuota } from "../middleware/enforcePostQuota.js";
import isCustomer from "../middleware/isCustomer.js";

const router = Router();

// Multer để parse multipart/form-data (ảnh)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @openapi
 * /create:
 *   post:
 *     summary: Create a new post by the authenticated user
 *     tags: [Users ( Posts )]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               price:
 *                 type: number
 *               phone:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [battery, vehicle]
 *               hasBattery:
 *                 type: boolean
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               year:
 *                 type: number
 *               mileage:
 *                 type: number
 *               condition:
 *                 type: string
 *               battery_brand:
 *                 type: string
 *               battery_model:
 *                 type: string
 *               battery_capacity:
 *                 type: number
 *               battery_type:
 *                 type: string
 *               battery_range:
 *                 type: number
 *               battery_condition:
 *                 type: string
 *               charging_time:
 *                 type: number
 *               compatible_models:
 *                 type: string
 *               thumbnailFile:
 *                 type: string
 *                 format: binary
 *               imageFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Post created successfully (pending verification / payment)
 */
router.post(
  "/create",
  authenticateToken,
  isCustomer,
  enforcePostQuota,
  upload.fields([
    { name: "thumbnailFile", maxCount: 1 },
    { name: "imageFiles", maxCount: 12 },
  ]),
  createMyPost
);

/**
 * @openapi
 * /post/{id}:
 *   patch:
 *     summary: Update a post by ID (authenticated user only)
 *     tags: [Users ( Posts )]
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
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               price:
 *                 type: number
 *               phone:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [battery, vehicle]
 *               verifyStatus:
 *                 type: string
 *                 enum: [verify, nonverify]
 *               thumbnailFile:
 *                 type: string
 *                 format: binary
 *               imageFiles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Cập nhật post thành công
 */
router.patch(
  "/post/:id",
  authenticateToken,
  isCustomer,
  upload.fields([
    { name: "thumbnailFile", maxCount: 1 },
    { name: "imageFiles", maxCount: 12 },
  ]),
  updateMyPost
);

/**
 * @openapi
 * /post/{id}/sale-status:
 *   patch:
 *     summary: Update saleStatus of a post (owner only)
 *     tags: [Users ( Posts )]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               saleStatus:
 *                 type: string
 *                 enum: [available, sold]
 *                 example: sold
 *     responses:
 *       200:
 *         description: Cập nhật saleStatus thành công
 *       400:
 *         description: Invalid saleStatus
 *       403:
 *         description: Not owner of post
 *       404:
 *         description: Post not found
 */
router.patch(
  "/post/:id/sale-status",
  authenticateToken,
  isCustomer,
  updateMyPostSaleStatus
);

/**
 * @openapi
 * /delete/{id}:
 *   delete:
 *     summary: Delete a post by ID (authenticated user only)
 *     tags: [Users ( Posts )]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của post cần xóa
 *     responses:
 *       200:
 *         description: Xóa post thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa bài đăng #15 thành công"
 *       403:
 *         description: Không có quyền (chỉ đúng owner / customer)
 *       404:
 *         description: Không tìm thấy post
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/delete/:id",
  authenticateToken,
  isCustomer,
  deleteMyPost
);

/**
 * @openapi
 * /me/post:
 *   get:
 *     summary: Get all posts created by the authenticated user
 *     tags: [Users ( Posts )]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bài đăng của chính user
 *       401:
 *         description: Unauthorized (missing or invalid token)
 *       500:
 *         description: Internal server error
 */
router.get(
  "/me/post",
  authenticateToken,
  isCustomer,
  getMyPosts
);

/**
 * @openapi
 * /user/{userId}:
 *   get:
 *     summary: Get all posts created by a specific user (public access)
 *     tags: [Users ( Posts )]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của user cần lấy danh sách bài đăng
 *     responses:
 *       200:
 *         description: Danh sách bài đăng của user
 *       404:
 *         description: Không tìm thấy user hoặc không có bài đăng
 *       500:
 *         description: Internal server error
 */
router.get(
  "/user/:userId",
  authenticateToken,
  isCustomer,
  getUserPosts
);


export default router;
