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
 */
router.get(
  "/user/:userId",
  authenticateToken,
  isCustomer,
  getUserPosts
);

export default router;
