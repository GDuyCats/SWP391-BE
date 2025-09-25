import {Router} from "express"
import { registerController, loginController, refreshTokenController, logoutController, profileController } from "../controller/auth.controller.js";
import { authenticateToken } from "../utils/jwt.js";

const router = Router();

router.post('/register', registerController)
router.post('/login', loginController)
router.post('/refreshtoken', refreshTokenController)
router.post('/logout', logoutController)
router.post('/profile',authenticateToken, profileController)
export default router