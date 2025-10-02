import {Router} from "express"
import { registerController, resendVerifyController, loginController, refreshTokenController, logoutController} from "../controller/auth.controller.js";
import authenticateToken from "../middleware/authenticateToken.js";

const router = Router();

router.post('/register', registerController)
router.post('/login', loginController)
router.post('/refreshtoken', refreshTokenController)
router.post('/logout', logoutController)
router.post('/resend-verify', resendVerifyController);
export default router