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
 *     summary: Tìm bài đăng (ưu tiên VIP, chỉ verify mặc định)
 *     description: |
 *       Trả về danh sách bài đăng đã verify, ưu tiên `vip` trước, sau đó sắp theo thời gian (mặc định mới nhất).
 *       Hỗ trợ tìm kiếm theo từ khóa, lọc theo loại bài (vip/nonvip), danh mục (battery/vehicle),
 *       khoảng giá, khoảng thời gian, và phân trang.
 *       Dùng `includeUnverified=true` để thấy cả bài chưa verify (nên bảo vệ bằng middleware).
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Từ khóa tìm trong title và content (không phân biệt hoa thường)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [vip, nonvip]
 *         description: Lọc theo loại bài (VIP / Non-VIP)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [battery, vehicle]
 *         description: Lọc theo danh mục (pin/xe điện)
 *       - in: query
 *         name: minPrice
 *         schema: { type: number, format: float, minimum: 0 }
 *         description: Giá tối thiểu
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number, format: float, minimum: 0 }
 *         description: Giá tối đa
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *         description: Ngày bắt đầu (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *         description: Ngày kết thúc (YYYY-MM-DD)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [vip_newest, vip_oldest, price_asc, price_desc]
 *           default: vip_newest
 *         description: Cách sắp xếp kết quả
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *         description: Trang hiện tại
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 *         description: Kích thước trang
 *       - in: query
 *         name: includeUnverified
 *         schema: { type: string, enum: [true, false] }
 *         description: Nếu là "true" thì trả luôn cả bài nonverify (chỉ nên dùng cho staff/admin)
 *     responses:
 *       200:
 *         description: Danh sách bài đăng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 *             examples:
 *               success:
 *                 summary: Ví dụ kết quả
 *                 value:
 *                   total: 2
 *                   page: 1
 *                   pageSize: 10
 *                   data:
 *                     - id: 12
 *                       title: "Bán iPhone 15 Pro Max"
 *                       content: "Fullbox, màu titan..."
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
 *         description: Không tìm thấy bài phù hợp hoặc chưa có dữ liệu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       500:
 *         description: Lỗi hệ thống
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
 *           example: "Không tìm thấy bài phù hợp"
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
 *         title: { type: string, example: "Bán iPhone 15 Pro Max" }
 *         content: { type: string, example: "Fullbox, màu titan..." }
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