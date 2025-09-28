import express from "express"
import { verifyMailController } from "../controller/mail.controller.js"
const router = express.Router()
router.get('/auth/verify-email', verifyMailController)
export default router