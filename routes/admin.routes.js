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
