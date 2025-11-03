// routes/post.public.route.js
import { Router } from "express";
import { listAdvancedPublicPosts, getPostDetail } from "../controller/post.public.controller.js";

const router = Router();

/**
 * @openapi
 * /posts:
 *   get:
 *     tags:
 *       - Posts (Public Search)
 *     summary: Search public posts (only isActive=true anđ VerifyStatus = verify , prioritize VIP)
 *     description: |
 *       Returns a list of active posts (`isActive = true`).
 *       Supports keyword, category, price/date ranges, VIP filters, sort, and pagination.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Keyword to search in title and content (case-insensitive)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [battery, vehicle]
 *         description: Filter by category
 *       - in: query
 *         name: minPrice
 *         schema: { type: number, format: float, minimum: 0 }
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number, format: float, minimum: 0 }
 *         description: Maximum price
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: vipPriority
 *         schema: { type: integer, minimum: 0 }
 *         description: Filter by exact VIP priority
 *       - in: query
 *         name: vipPriorityMin
 *         schema: { type: integer, minimum: 0 }
 *         description: Filter posts with VIP priority >= this value
 *       - in: query
 *         name: vipTier
 *         schema:
 *           type: string
 *           enum: [diamond, gold, silver]
 *         description: Filter by VIP tier (alternative to vipPriority)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [vip_newest, vip_oldest, price_asc, price_desc]
 *         description: Sort order (VIP prioritized first)
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *         description: Current page number
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 50 }
 *         description: Number of posts per page
 *     responses:
 *       200:
 *         description: List of active posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 *       404:
 *         description: No matching posts found or no data available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */

/**
 * @openapi
 * /posts/{id}:
 *   get:
 *     tags:
 *       - Posts (Public Search)
 *     summary: Get public post detail by ID (merge VehicleDetail & BatteryDetail)
 *     description: |
 *       Trả chi tiết một bài đăng **active** (isActive=true), gộp các trường từ VehicleDetail và BatteryDetail
 *       vào cùng một object, đúng theo UI bạn yêu cầu.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Public post detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetailResponse'
 *       400:
 *         description: Invalid post id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       404:
 *         description: Post not found or inactive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         message: { type: string }
 *
 *     Pagination:
 *       type: object
 *       properties:
 *         page:     { type: integer, example: 1 }
 *         pageSize: { type: integer, example: 10 }
 *         total:    { type: integer, example: 35 }
 *       required: [page, pageSize, total]
 *
 *     UserPublic:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         username: { type: string }
 *         avatar: { type: string, nullable: true }
 *
 *     PostPublic:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         title: { type: string }
 *         content: { type: string }
 *         image:
 *           type: array
 *           items: { type: string }
 *         thumbnail: { type: string, nullable: true }
 *         price: { type: number, format: float }
 *         phone: { type: string, nullable: true }
 *         category:
 *           type: string
 *           enum: [battery, vehicle]
 *         isVip: { type: boolean }
 *         vipTier:
 *           type: string
 *           enum: [diamond, gold, silver]
 *           nullable: true
 *         vipPriority: { type: integer }
 *         vipExpiresAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *         User:
 *           $ref: '#/components/schemas/UserPublic'
 *
 *     PostDetailResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/PostPublic'
 *         - type: object
 *           description: Kết hợp các trường chi tiết cho vehicle/battery (có thể null tùy category).
 *           properties:
 *             hasBattery:       { type: boolean, nullable: true, description: "Vehicle: có kèm pin hay không" }
 *             brand:            { type: string,  nullable: true }
 *             model:            { type: string,  nullable: true }
 *             year:             { type: number,  nullable: true }
 *             mileage:          { type: number,  nullable: true }
 *             condition:        { type: string,  nullable: true }
 *             battery_brand:    { type: string,  nullable: true }
 *             battery_model:    { type: string,  nullable: true }
 *             battery_capacity: { type: number,  nullable: true }
 *             battery_type:     { type: string,  nullable: true }
 *             battery_range:    { type: number,  nullable: true }
 *             battery_condition:{ type: string,  nullable: true }
 *             charging_time:    { type: number,  nullable: true }
 *             compatible_models:
 *               oneOf:
 *                 - type: array
 *                   items: { type: string }
 *                 - type: string
 *                 - type: "null"
 *
 *     PostListResponse:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PostPublic'
 *         pagination:
 *           $ref: '#/components/schemas/Pagination'
 *       required: [items, pagination]
 */

router.get("/", listAdvancedPublicPosts);
router.get("/:id", getPostDetail);

export default router;
