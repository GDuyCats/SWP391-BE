import express from "express";
import {
  getUsers,
  getStaffAccounts,
  createUsers,
  updateUsers,
  deleteUsers,
} from "../controller/admin.user.controller.js";
import authenticateToken from "../middleware/authenticateToken.js";
import isAdmin from "../middleware/isAdmin.js";

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Admin-only management endpoints
 *
 * /admin/user:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users (admin only)
 *     description: |
 *       Return all users in the system.
 *       Password / refreshToken / tokenVersion are never exposed.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Get all users successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 8
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:         { type: integer, example: 1 }
 *                       username:   { type: string, example: "admin" }
 *                       phone:      { type: string, nullable: true, example: "0912345678" }
 *                       email:      { type: string, example: "admin@gmail.com" }
 *                       avatar:     { type: string, nullable: true, example: "https://cdn.example/avatar.png" }
 *                       role:
 *                         type: string
 *                         enum: [admin, staff, customer]
 *                         example: "staff"
 *                       isVerified: { type: boolean, example: true }
 *                       createdAt:  { type: string, format: date-time }
 *                       updatedAt:  { type: string, format: date-time }
 *       401: { description: Missing or invalid token }
 *       403: { description: Not authorized (admin only) }
 *
 * /admin/staff:
 *   get:
 *     tags: [Admin]
 *     summary: Get all staff accounts (admin only)
 *     description: |
 *       Return all users with role = "staff".
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Get staff list successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 staff:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:         { type: integer, example: 2 }
 *                       username:   { type: string, example: "staff01" }
 *                       phone:      { type: string, nullable: true, example: "0987654321" }
 *                       email:      { type: string, example: "staff@gmail.com" }
 *                       avatar:     { type: string, nullable: true }
 *                       role:
 *                         type: string
 *                         enum: [admin, staff, customer]
 *                         example: "staff"
 *                       isVerified: { type: boolean, example: true }
 *                       createdAt:  { type: string, format: date-time }
 *                       updatedAt:  { type: string, format: date-time }
 *       401: { description: Missing or invalid token }
 *       403: { description: Not authorized (admin only) }
 *
 * /admin/create_user:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new user
 *     description: |
 *       Admin creates a new account.
 *       Password will be hashed before saving.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password, role]
 *             properties:
 *               username: { type: string, example: "newstaff" }
 *               email: { type: string, example: "newstaff@gmail.com" }
 *               phone: { type: string, nullable: true, example: "0911222333" }
 *               avatar: { type: string, nullable: true, example: "https://cdn.example/avatar-newstaff.png" }
 *               password: { type: string, format: password, example: "123456789" }
 *               role: { type: string, enum: [admin, staff, customer], example: "staff" }
 *               isVerified: { type: boolean, example: true }
 *     responses:
 *       201: { description: Create user successfully }
 *       401: { description: Missing or invalid token }
 *       403: { description: Not authorized (admin only) }
 *       409: { description: Email or username already exists }
 *
 * /admin/user/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update user by id
 *     description: |
 *       Admin can update user fields like username, email, phone, avatar, role, isVerified.
 *       If password is provided it will be re-hashed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string, example: "updated_staff" }
 *               email: { type: string, example: "updated_staff@gmail.com" }
 *               phone: { type: string, example: "0909888777" }
 *               avatar: { type: string, example: "https://cdn.example/newavatar.png" }
 *               role: { type: string, enum: [admin, staff, customer], example: "staff" }
 *               isVerified: { type: boolean, example: true }
 *               password: { type: string, format: password, example: "newStrongPass123" }
 *     responses:
 *       200: { description: User updated successfully }
 *       401: { description: Missing or invalid token }
 *       403: { description: Not authorized (admin only) }
 *       404: { description: User not found }
 *
 *   delete:
 *     tags: [Admin]
 *     summary: Delete user by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: User ID
 *     responses:
 *       200: { description: User deleted successfully }
 *       401: { description: Missing or invalid token }
 *       403: { description: Not authorized (admin only) }
 *       404: { description: User not found }
 */

router.get("/user", authenticateToken, isAdmin, getUsers);
router.get("/staff", authenticateToken, isAdmin, getStaffAccounts);
router.post("/create_user", authenticateToken, isAdmin, createUsers);
router.put("/user/:id", authenticateToken, isAdmin, updateUsers);
router.delete("/user/:id", authenticateToken, isAdmin, deleteUsers);

export default router;
