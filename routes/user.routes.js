import { Router } from "express";
import {profileController, updateMyProfile} from '../controller/user.controller.js'
import authenticateToken from "../middleware/authenticateToken.js";

const router = Router();

router.post('/profile',authenticateToken, profileController)
router.patch("/profile/update", authenticateToken, updateMyProfile);
export default router