import express from 'express'
import dotenv from "dotenv"
import cors from 'cors'
import { connection } from './postgres/postgres.js'
import admin_routes from './routes/admin.routes.js'
import auth_routes from './routes/auth.routes.js'
import mail_routes from './routes/mail.routes.js'
import user_routes from './routes/user.routes.js'
import cookieParser from 'cookie-parser'
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";

dotenv.config();

const app = express()
app.use(cookieParser())
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use(admin_routes)
app.use(auth_routes)
app.use(mail_routes)
app.use(user_routes)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
const start = async () => {                       // ĐÃ SỬA
  try {
    await connection()                             // ĐÃ SỬA: thay cho connection()
    const PORT = Number(process.env.BE_PORT) || 8081// ĐÃ SỬA
    const HOST = '0.0.0.0'                        // ĐÃ SỬA: cần cho Railway
    app.listen(PORT, HOST, () => {
      console.log(`Server is running at http://${HOST}:${PORT}`)
      // Nếu có API_BASE_URL, in ra link Swagger thân thiện
      const base = process.env.API_BASE_URL || `http://localhost:${PORT}` // ĐÃ SỬA
      console.log(`Swagger docs at ${base}/api-docs`)                     // ĐÃ SỬA
    })
  } catch (err) {
    console.error('Failed to start server:', err) // ĐÃ SỬA
    process.exit(1)
  }
}
start()
export default app