// routes/admin.plan.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { createVipPlan, getAllVipPlans, toggleVipPlan, updateVipPlan, deleteVipPlan } from "../controller/admin.vipPlan.controller.js";
import isAdmin from "../middleware/isAdmin.js";

const router = Router();
router.post("/vip-plans", authenticateToken, isAdmin, createVipPlan);
router.get("/vip-plans", authenticateToken, isAdmin, getAllVipPlans); // (tất cả, hoặc thêm ?active=)
router.patch("/vip-plans/:id", authenticateToken, isAdmin, updateVipPlan); // ✅ update
router.delete("/vip-plans/:id", authenticateToken, isAdmin, deleteVipPlan); // ✅ soft delete
router.patch("/vip-plans/:id/toggle", authenticateToken, isAdmin, toggleVipPlan)
export default router;
