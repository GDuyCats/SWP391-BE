import express from "express"
import { getUsers, createUsers, updateUsers, deleteUsers, getAdminDashboard } from "../controller/admin.user.controller.js";
import authenticateToken from "../middleware/authenticateToken.js";
import isAdmin from "../middleware/isAdmin.js";


const router = express.Router();

router.get('/', getUsers)
router.post('/', createUsers)
router.put('/:id', authenticateToken, isAdmin, updateUsers)
router.delete('/:id', authenticateToken, isAdmin, deleteUsers)
router.get("/dashboard", authenticateToken, isAdmin, getAdminDashboard);
export default router
