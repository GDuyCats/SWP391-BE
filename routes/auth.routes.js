import { Router } from "express";
import { 
  registerController, 
  resendVerifyController, 
  loginController, 
  refreshTokenController, 
  logoutController 
} from "../controller/auth.controller.js";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: testuser
 *               email:
 *                 type: string
 *                 example: test@example.com
 *               password:
 *                 type: string
 *                 example: StrongP@ssw0rd
 *     responses:
 *       201:
 *         description: Tạo tài khoản thành công
 *       409:
 *         description: Email đã tồn tại
 */
router.post('/register', registerController)

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Đăng nhập và nhận access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@example.com
 *               password:
 *                 type: string
 *                 example: StrongP@ssw0rd
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về access token và refresh token
 *       401:
 *         description: Sai email hoặc mật khẩu
 */
router.post('/login', loginController)

/**
 * @openapi
 * /auth/refreshtoken:
 *   post:
 *     summary: Lấy access token mới từ refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Trả về access token mới
 *       403:
 *         description: Refresh token không hợp lệ hoặc đã hết hạn
 */
router.post('/refreshtoken', refreshTokenController)

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Đăng xuất và xoá refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post('/logout', logoutController)

/**
 * @openapi
 * /auth/resend-verify:
 *   post:
 *     summary: Gửi lại email xác thực tài khoản
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@example.com
 *     responses:
 *       200:
 *         description: Gửi lại email xác thực thành công
 *       404:
 *         description: Không tìm thấy user
 */
router.post('/resend-verify', resendVerifyController);

export default router
