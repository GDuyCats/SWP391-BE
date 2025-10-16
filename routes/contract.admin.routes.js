// routes/contract.admin.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { assignStaffToContract } from "../controller/contract.controller.js";

const router = Router();

// Admin gán staff cho hợp đồng
router.post("/assign-staff", authenticateToken, assignStaffToContract);

export default router;
