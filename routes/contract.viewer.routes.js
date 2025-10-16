// routes/contract.viewer.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { getContractForViewer } from "../controller/contract.controller.js";

const router = Router();

// Người dùng xem hợp đồng của chính mình (buyer/seller/staff/admin)
router.get("/contracts/:id", authenticateToken, getContractForViewer);

export default router;
