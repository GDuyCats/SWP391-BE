import { Router } from "express";
import { listAdvancedPublicPosts } from "../controller/post.public.controller.js"

const router = Router();

// GET /api/posts/public?q=iphone&page=1&pageSize=12
/**
 * @openapi
 * /:
 *   get:
 *     tags:
 *       - Posts (Public Search)
 *     summary: Find post (prioritize VIP, only fetch Post with isVerify = true)
 *     description: |
 *       Returns a list of verified posts, prioritizing `vip` first, then sorted by time (default: newest).
 *       Supports keyword search, filtering by post type (vip/nonvip), category (battery/vehicle),
 *       price range, date range, and pagination.
 *
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Keyword to search in title and content (case-insensitive)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [vip, nonvip]
 *         description: Filter by post type (VIP / Non-VIP)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [battery, vehicle]
 *         description: Filter by category (battery/vehicle)
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
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [vip_newest, vip_oldest, price_asc, price_desc]
 *           default: vip_newest
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Current page
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *         description: Page size
 *     responses:
 *       200:
 *         description: List of posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 *             examples:
 *               success:
 *                 summary: Example result
 *                 value:
 *                   total: 2
 *                   page: 1
 *                   pageSize: 10
 *                   data:
 *                     - id: 12
 *                       title: "Selling iPhone 15 Pro Max"
 *                       content: "Fullbox, titanium color..."
 *                       image:
 *                         - "https://example.com/iphone1.jpg"
 *                         - "https://example.com/iphone2.jpg"
 *                       thumbnail: "https://example.com/iphone_thumb.jpg"
 *                       price: 27000000
 *                       phone: "0909123456"
 *                       type: "vip"
 *                       verifyStatus: "verify"
 *                       category: "vehicle"
 *                       createdAt: "2025-10-09T03:21:45.000Z"
 *                       updatedAt: "2025-10-09T03:21:45.000Z"
 *                       User:
 *                         id: 3
 *                         username: "nhatn"
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
 *         username: { type: string, example: "nhatn" }
 *         avatar: { type: string, nullable: true, example: "https://example.com/ava.jpg" }
 *     PostPublic:
 *       type: object
 *       properties:
 *         id: { type: integer, example: 12 }
 *         title: { type: string, example: "Selling iPhone 15 Pro Max" }
 *         content: { type: string, example: "Fullbox, titanium color..." }
 *         image:
 *           type: array
 *           items: { type: string, example: "https://example.com/iphone1.jpg" }
 *         thumbnail: { type: string, nullable: true, example: "https://example.com/iphone_thumb.jpg" }
 *         price: { type: number, format: float, example: 27000000 }
 *         phone: { type: string, nullable: true, example: "0909123456" }
 *         type:
 *           type: string
 *           enum: [vip, nonvip]
 *           example: vip
 *         verifyStatus:
 *           type: string
 *           enum: [verify, nonverify]
 *           example: verify
 *         category:
 *           type: string
 *           enum: [battery, vehicle]
 *           example: vehicle
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
