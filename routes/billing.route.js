import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { listActivePlans, checkoutFromPlan } from "../controller/billing.plan.controller.js";
const router = Router();

router.get("/plans", listActivePlans);
router.post("/checkout-from-plan", authenticateToken, checkoutFromPlan);

export default router;
