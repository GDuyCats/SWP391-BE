import express from 'express'
import dotenv from "dotenv"
import cors from 'cors'
import { connection } from './postgres/postgres.js'
import admin_routes from './routes/admin.routes.js'
import auth_routes from './routes/auth.routes.js'
import mail_routes from './routes/mail.routes.js'
import user_routes from './routes/user.routes.js'
import cookieParser from 'cookie-parser'
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

app.listen(process.env.BE_PORT, () => {
    console.log(`Server is running at port ${process.env.BE_PORT}`)
})

connection()