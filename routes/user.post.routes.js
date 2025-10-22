import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { createMyPost, updateMyPost, deleteMyPost, getMyPosts, getUserPosts } from "../controller/user.post.controller.js";
import { enforcePostQuota } from "../middleware/enforcePostQuota.js";

const router = Router();

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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:        { type: string, example: "Bán VinFast VF8" }
 *               content:      { type: string, example: "Xe gia đình, pin còn 90%" }
 *               price:        { type: number, example: 720000000 }
 *               phone:        { type: string, example: "0912345678" }
 *               category:
 *                 type: string
 *                 enum: [battery, vehicle]
 *                 example: vehicle
 *               thumbnail:    { type: string, example: "https://example.com/vf8-thumb.jpg" }
 *               image:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["https://example.com/vf8-1.jpg","https://example.com/vf8-2.jpg"]
 *               vipPlanId:    { type: integer, nullable: true, example: 1 }
 *
 *               # Vehicle fields
 *               hasBattery:
 *                 type: boolean
 *                 description: "Chỉ áp dụng khi category=vehicle. true (mặc định): xe bán kèm pin; false: xe thuê pin/không kèm pin."
 *                 example: true
 *               brand:        { type: string, example: "VinFast" }
 *               model:        { type: string, example: "VF8" }
 *               year:         { type: number, example: 2023 }
 *               mileage:      { type: number, example: 12000 }
 *               condition:    { type: string, example: "used" }
 *
 *               # Battery info (dùng cho vehicle khi hasBattery=true, và cho category=battery)
 *               battery_brand:      { type: string,  example: "VinES" }
 *               battery_model:      { type: string,  example: "Pack82KWh-LFP" }
 *               battery_capacity:   { type: number,  example: 82 }
 *               battery_type:       { type: string,  example: "LFP" }
 *               battery_range:      { type: number,  example: 450 }
 *               battery_condition:  { type: string,  example: "Còn 90%" }
 *               charging_time:      { type: number,  example: 7.5 }
 *               compatible_models:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["VF e34","VF 5"]
 *           examples:
 *             vehicle_with_battery:
 *               summary: Vehicle (hasBattery=true)
 *               value:
 *                 title: "Bán VF8 kèm pin"
 *                 content: "Pin còn 90%"
 *                 price: 720000000
 *                 phone: "0912345678"
 *                 category: "vehicle"
 *                 hasBattery: true
 *                 brand: "VinFast"
 *                 model: "VF8"
 *                 year: 2023
 *                 mileage: 12000
 *                 battery_brand: "VinES"
 *                 battery_capacity: 82
 *             vehicle_without_battery:
 *               summary: Vehicle (hasBattery=false, xe thuê pin)
 *               value:
 *                 title: "Bán VF8 thuê pin hãng"
 *                 content: "Xe 98%, thuê pin VinFast"
 *                 price: 580000000
 *                 phone: "0901234567"
 *                 category: "vehicle"
 *                 hasBattery: false
 *                 brand: "VinFast"
 *                 model: "VF8"
 *                 year: 2023
 *                 mileage: 8000
 *             battery_only:
 *               summary: Battery post
 *               value:
 *                 title: "Pin VinES 42 kWh còn 95%"
 *                 content: "Tháo xe VF e34"
 *                 price: 98000000
 *                 category: "battery"
 *                 battery_brand: "VinES"
 *                 battery_capacity: 42
 *     responses:
 *       201: { description: Post created successfully (pending verification / payment) }
 *       400: { description: Invalid data }
 *       401: { description: Unauthorized }
 *       404: { description: VIP plan not found }
 *       500: { description: Internal server error }
 */

router.post("/create", authenticateToken, enforcePostQuota, createMyPost);

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
 *         schema: { type: integer }
 *         description: ID của bài post cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:    { type: string, example: "Bán VinFast VF8 (giảm giá)" }
 *               content:  { type: string, example: "Giảm nhẹ, bao test hãng." }
 *               price:    { type: number, example: 699000000 }
 *               phone:    { type: string, example: "0912345678" }
 *               category:
 *                 type: string
 *                 enum: [battery, vehicle]
 *                 example: vehicle
 *               thumbnail: { type: string, example: "https://example.com/vf8-thumb.jpg" }
 *               image:
 *                 type: array
 *                 items: { type: string }
 *
 *               # Vehicle fields
 *               hasBattery:
 *                 type: boolean
 *                 description: "Chỉ áp dụng khi category=vehicle. false cho phép bỏ trống toàn bộ battery_*."
 *                 example: true
 *               brand:   { type: string, example: "VinFast" }
 *               model:   { type: string, example: "VF8" }
 *               year:    { type: number, example: 2023 }
 *               mileage: { type: number, example: 13000 }
 *               condition: { type: string, example: "used" }
 *
 *               # Battery info (vehicle hasBattery=true hoặc category=battery)
 *               battery_brand:      { type: string,  example: "VinES" }
 *               battery_model:      { type: string,  example: "Pack82KWh-LFP" }
 *               battery_capacity:   { type: number,  example: 82 }
 *               battery_type:       { type: string,  example: "LFP" }
 *               battery_range:      { type: number,  example: 440 }
 *               battery_condition:  { type: string,  example: "Còn 88%" }
 *               charging_time:      { type: number,  example: 7.5 }
 *               compatible_models:
 *                 type: array
 *                 items: { type: string }
 *
 *               # Admin/Staff only
 *               verifyStatus:
 *                 type: string
 *                 enum: [verify, nonverify]
 *                 example: verify
 *     responses:
 *       200: { description: Cập nhật post thành công }
 *       400: { description: Dữ liệu không hợp lệ }
 *       401: { description: Chưa đăng nhập }
 *       403: { description: Không có quyền cập nhật post này }
 *       404: { description: Không tìm thấy post }
 *       500: { description: Lỗi máy chủ nội bộ }
 */

router.patch("/post/:id", authenticateToken, updateMyPost);


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
router.delete("/delete/:id", authenticateToken, deleteMyPost);

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
router.get("/me/post", authenticateToken, getMyPosts);

/**
 * @openapi
 * /user/{userId}:
 *   get:
 *     summary: Get all posts created by a specific user (public access)
 *     tags: [Users ( Posts )]
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
router.get("/user/:userId", authenticateToken, getUserPosts);

export default router;
