import { Router } from "express";
import { listAdvancedPublicPosts } from "../controller/post.public.controller.js";

const router = Router();

/**
 * @openapi
 * /:
 *   get:
 *     tags:
 *       - Posts (Public Search)
 *     summary: Search public posts (only isActive=true, prioritize VIP)
 *     description: |
 *       Returns a list of **active** posts (`isActive = true`), supports:
 *       - Keyword search (`q`)
 *       - Filter by category (`battery` / `vehicle`)
 *       - Filter by price range, date range
 *       - Filter by VIP priority (`vipPriority`, `vipPriorityMin`) or tier (`vipTier`)
 *       - Sort order (`vip_newest`, `vip_oldest`, `price_asc`, `price_desc`)
 *       - Pagination (`page`, `pageSize`)
 *
 *       VIP posts are prioritized by default in all sorts.
 *
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Keyword to search in title and content (case-insensitive)
 *         examples:
 *           search_vinfast:
 *             summary: Search by keyword
 *             value: VinFast
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [battery, vehicle]
 *         description: Filter by category
 *         examples:
 *           vehicle:
 *             summary: Only electric car posts
 *             value: vehicle
 *           battery:
 *             summary: Only battery posts
 *             value: battery
 *       - in: query
 *         name: minPrice
 *         schema: { type: number, format: float, minimum: 0 }
 *         description: Minimum price
 *         example: 500000000
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number, format: float, minimum: 0 }
 *         description: Maximum price
 *         example: 800000000
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *         description: Start date (YYYY-MM-DD)
 *         example: "2025-10-01"
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *         description: End date (YYYY-MM-DD)
 *         example: "2025-10-21"
 *       - in: query
 *         name: vipPriority
 *         schema: { type: integer, minimum: 0 }
 *         description: Filter by exact VIP priority
 *         example: 3
 *       - in: query
 *         name: vipPriorityMin
 *         schema: { type: integer, minimum: 0 }
 *         description: Filter posts with VIP priority >= this value
 *         example: 1
 *       - in: query
 *         name: vipTier
 *         schema:
 *           type: string
 *           enum: [diamond, gold, silver]
 *         description: Filter by VIP tier (alternative to vipPriority)
 *         example: diamond
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [vip_newest, vip_oldest, price_asc, price_desc]
 *           default: vip_newest
 *         description: Sort order (VIP prioritized first)
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Current page number
 *         example: 1
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *         description: Number of posts per page
 *         example: 10
 *
 *     responses:
 *       200:
 *         description: List of active posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 *             examples:
 *               search_example:
 *                 summary: Keyword + category + VIP filter example
 *                 value:
 *                   url: "/?q=VF8&category=vehicle&minPrice=500000000&maxPrice=800000000&vipPriorityMin=1&sort=price_desc&page=1&pageSize=10"
 *                   total: 2
 *                   page: 1
 *                   pageSize: 10
 *                   data:
 *                     - id: 12
 *                       title: "Bán VinFast VF8 kèm pin VinES"
 *                       content: "Xe 12.000km, pin còn 90%..."
 *                       image:
 *                         - "https://example.com/vf8-1.jpg"
 *                         - "https://example.com/vf8-2.jpg"
 *                       thumbnail: "https://example.com/vf8-thumb.jpg"
 *                       price: 720000000
 *                       phone: "0909123456"
 *                       category: "vehicle"
 *                       isVip: true
 *                       vipTier: "diamond"
 *                       vipPriority: 3
 *                       vipExpiresAt: "2025-12-31T23:59:59.000Z"
 *                       createdAt: "2025-10-09T03:21:45.000Z"
 *                       User:
 *                         id: 3
 *                         username: "linhng"
 *                         avatar: "https://example.com/ava.jpg"
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
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "No matching posts found"
 *     UserPublic:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 3 }
 *         username: { type: string, example: "linhng" }
 *         avatar: { type: string, nullable: true, example: "https://example.com/ava.jpg" }
 *     PostPublic:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 12 }
 *         title: { type: string, example: "Bán VinFast VF8 kèm pin VinES" }
 *         content: { type: string, example: "Xe 12.000km, pin còn 90%..." }
 *         image:
 *           type: array
 *           items: { type: string, example: "https://example.com/vf8-1.jpg" }
 *         thumbnail: { type: string, nullable: true, example: "https://example.com/vf8-thumb.jpg" }
 *         price: { type: number, format: float, example: 720000000 }
 *         phone: { type: string, nullable: true, example: "0909123456" }
 *         category:
 *           type: string
 *           enum: [battery, vehicle]
 *           example: vehicle
 *         isVip: { type: boolean, example: true }
 *         vipTier:
 *           type: string
 *           enum: [diamond, gold, silver]
 *           nullable: true
 *           example: diamond
 *         vipPriority: { type: integer, example: 3 }
 *         vipExpiresAt: { type: string, format: date-time, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *         User:
 *           $ref: '#/components/schemas/UserPublic'
 *     PostListResponse:
 *       type: object
 *       properties:
 *         total: { type: integer, example: 42 }
 *         page: { type: integer, example: 1 }
 *         pageSize: { type: integer, example: 10 }
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PostPublic'
 */

router.get("/", listAdvancedPublicPosts);
export default router;
