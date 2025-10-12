/**
 * @openapi
 * /admin/user:
 *   get:
 *     tags: [Admin]
 *     summary: Get all users
 *     responses:
 *       200: { description: Get all users successfully ! }
 *       403: { description: Not authorized !} 
 *
 * /admin/create_user:
 *   post:
 *     tags: [Admin]
 *     summary: Create a new user. Default password is 123456789
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
 *       201: { description: Create user successfully !}
 *
 * /admin/user/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update user
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
 *       404: { description: User's id not found }
 *
 *   delete:
 *     tags: [Admin]
 *     summary: Delete user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: OK }
 *       404: { description: User's id not found }
 *
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: get in Dashboard page 
 *     responses:
 *       200:
 *         description: OK
 *       403:
 *         description: Not authorized !
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
