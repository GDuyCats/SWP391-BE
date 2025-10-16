// routes/contract.otp.routes.js
import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken.js";
import { sendContractOtp, verifyContractOtp } from "../controller/contract.controller.js";

const router = Router();

// Staff/Admin gửi OTP
router.post("/staff/contracts/send-otp", authenticateToken, sendContractOtp);

// Buyer/Seller xác nhận OTP
router.post("/contracts/verify-otp", authenticateToken, verifyContractOtp);

export default router;
