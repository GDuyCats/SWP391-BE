import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { createPurchaseRequest } from "../controller/contract.controller.js";

const router = Router();

// Buyer gửi yêu cầu mua
router.post("/request", authenticateToken, createPurchaseRequest);

export default router;