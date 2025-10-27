import { Router } from "express";
import multer from "multer";
import authenticateToken from "../middleware/authenticateToken.js";
import {
  createMyPost,
  updateMyPost,
  deleteMyPost,
  getMyPosts,
  getUserPosts,
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
 *                 example: "Bán VinFast VF8"
 *               content:
 *                 type: string
 *                 example: "Xe gia đình, pin còn 90%"
 *               price:
 *                 type: number
 *                 example: 720000000
 *               phone:
 *                 type: string
 *                 example: "0912345678"
 *               category:
 *                 type: string
 *                 enum: [battery, vehicle]
 *                 example: vehicle
 *               hasBattery:
 *                 type: boolean
 *                 example: true
 *               brand:
 *                 type: string
 *                 example: "VinFast"
 *               model:
 *                 type: string
 *                 example: "VF8"
 *               year:
 *                 type: number
 *                 example: 2023
 *               mileage:
 *                 type: number
 *                 example: 12000
 *               condition:
 *                 type: string
 *                 example: "used"
 *               battery_brand:
 *                 type: string
 *                 example: "VinES"
 *               battery_model:
 *                 type: string
 *                 example: "Pack82KWh-LFP"
 *               battery_capacity:
 *                 type: number
 *                 example: 82
 *               battery_type:
 *                 type: string
 *                 example: "LFP"
 *               battery_range:
 *                 type: number
 *                 example: 450
 *               battery_condition:
 *                 type: string
 *                 example: "Còn 90%"
 *               charging_time:
 *                 type: number
 *                 example: 7.5
 *               compatible_models:
 *                 type: string
 *                 description: 'Chuỗi JSON, ví dụ: ["VF e34","VF 5"]'
 *                 example: '["VF e34","VF 5"]'
 *
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
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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
 *         description: ID của bài post cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Bán VinFast VF8 (giảm giá)"
 *               content:
 *                 type: string
 *                 example: "Giảm nhẹ, bao test hãng."
 *               price:
 *                 type: number
 *                 example: 699000000
 *               phone:
 *                 type: string
 *                 example: "0912345678"
 *               category:
 *                 type: string
 *                 enum: [battery, vehicle]
 *                 example: vehicle
 *               hasBattery:
 *                 type: boolean
 *                 example: true
 *               brand:
 *                 type: string
 *                 example: "VinFast"
 *               model:
 *                 type: string
 *                 example: "VF8"
 *               year:
 *                 type: number
 *                 example: 2023
 *               mileage:
 *                 type: number
 *                 example: 13000
 *               condition:
 *                 type: string
 *                 example: "used"
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
 *                 description: 'Chuỗi JSON, ví dụ: ["VF e34","VF 5"]'
 *               verifyStatus:
 *                 type: string
 *                 enum: [verify, nonverify]
 *
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
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền cập nhật post này
 *       404:
 *         description: Không tìm thấy post
 *       500:
 *         description: Lỗi máy chủ nội bộ
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
 *         description: ID of the post to delete
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
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
 *         description: Successfully retrieved user posts
 *       401:
 *         description: Unauthorized
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
 *         description: ID of the user
 *     responses:
 *       200:
 *         description: Successfully retrieved posts of the user
 *       404:
 *         description: User or posts not found
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
