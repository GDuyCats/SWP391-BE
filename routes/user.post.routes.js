import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { createMyPost, updateMyPost, deleteMyPost, getMyPosts, getUserPosts } from "../controller/user.post.controller.js";

const router = Router();

/**
 * @openapi
 * /create:
 *   post:
 *     summary: Create a new post by the authenticated user
 *     tags: [Posts (User)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Selling electric bike
 *               content:
 *                 type: string
 *                 example: Like new, bought 2 months ago
 *               price:
 *                 type: number
 *                 example: 15000000
 *               category:
 *                 type: string
 *                 enum: [battery, vehicle]
 *                 example: vehicle
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/create", authenticateToken, createMyPost);

/**
 * @openapi
 * /post/{id}:
 *   patch:
 *     summary: Update a post by ID (authenticated user only)
 *     tags: [Posts (User)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the post to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Selling used electric bike
 *               price:
 *                 type: number
 *                 example: 14000000
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */
router.patch("/post/:id", authenticateToken, updateMyPost);

/**
 * @openapi
 * /delete/{id}:
 *   delete:
 *     summary: Delete a post by ID (authenticated user only)
 *     tags: [Posts (User)]
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
 *     tags: [Posts (User)]
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
 *     tags: [Posts (User)]
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
