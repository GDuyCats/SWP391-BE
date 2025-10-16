// routes/contract.staff.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { recordAppointment, finalizeNegotiation } from "../controller/contract.controller.js";

const router = Router();

// Staff ghi nhận lịch hẹn
router.post("/appointment", authenticateToken, recordAppointment);
router.post("/finalize", authenticateToken, finalizeNegotiation);
export default router;
