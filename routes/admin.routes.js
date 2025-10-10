/**
 * @openapi
 * /admin/user:
 *   get:
 *     tags: [Admin]
 *     summary: Lấy danh sách tất cả user
 *     responses:
 *       200: { description: Danh sách user }
 *       403: { description: Không có quyền }
 *
 * /admin/create_user:
 *   post:
 *     tags: [Admin]
 *     summary: Tạo user mới
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password, role]
 *             properties:
 *               username: { type: string }
 *               email: { type: string }
 *               password: { type: string, format: password }
 *               role: { type: string, enum: [admin, staff, customer] }
 *     responses:
 *       201: { description: User đã được tạo }
 *
 * /admin/user/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Cập nhật user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: { type: string }
 *               email: { type: string }
 *               role: { type: string, enum: [admin, staff, customer] }
 *               avatar: { type: string }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tìm thấy user }
 *
 *   delete:
 *     tags: [Admin]
 *     summary: Xoá user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Không tìm thấy user }
 *
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Lấy dashboard
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Không có quyền
 */

import express from "express"
import { getUsers, createUsers, updateUsers, deleteUsers, getAdminDashboard } from "../controller/admin.user.controller.js";
import authenticateToken from "../middleware/authenticateToken.js";
import isAdmin from "../middleware/isAdmin.js";
const router = express.Router();

router.get('/admin/user', getUsers)
router.post('/admin/create_user', createUsers)
router.put('/admin/user/:id', authenticateToken, isAdmin, updateUsers)
router.delete('/admin/user/:id', authenticateToken, isAdmin, deleteUsers)
router.get("/admin/dashboard", authenticateToken, isAdmin, getAdminDashboard);
export default router
