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
 * /register:
 *   post:
 *     summary: Create a new account. Default password is 123456789
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
 *         description: Account created successfully
 *       409:
 *         description: Email already exists
 */
router.post('/register', registerController)

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Login and receive accessToken. Default password is 123456789
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: 1234567890
 *     responses:
 *       200:
 *         description: Login successful, returns access token and refresh token
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', loginController)

/**
 * @openapi
 * /refreshtoken:
 *   post:
 *     summary: Get a new access token from refresh token
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
 *         description: Returns a new access token
 *       403:
 *         description: Invalid or expired refresh token
 */
router.post('/refreshtoken', refreshTokenController)

/**
 * @openapi
 * /logout:
 *   post:
 *     summary: Logout and remove refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', logoutController)

/**
 * @openapi
 * /resend-verify:
 *   post:
 *     summary: Resend account verification email
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
 *         description: Verification email resent successfully
 *       404:
 *         description: User not found
 */
router.post('/resend-verify', resendVerifyController);

export default router
