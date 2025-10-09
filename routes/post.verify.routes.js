// routes/post.verify.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { getAllPosts, verifyPost } from "../controller/admin.staff.post.verify.controller.js";
import isStaff from "../middleware/isSTaff.js";
import isStaffOrAdmin from "../middleware/isStaffAndAdmin.js";

const router = Router();

// Staff/Admin duyệt bài
router.patch("/:id/verify", authenticateToken, isStaff, verifyPost);
router.get("/all", authenticateToken,isStaffOrAdmin, getAllPosts)
export default router;
