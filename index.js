import express from 'express'
import { connection } from './postgres/postgres.js'
import dotenv from "dotenv";
import admin_routes from './routes/admin.routes.js';
import auth_routes from './routes/auth.routes.js'
import cookieParser from 'cookie-parser';
import cors from 'cors'
dotenv.config();

const app = express()
app.use(cookieParser())
app.use(cors())
app.use(express.json())

app.use(admin_routes)
app.use(auth_routes)

app.listen(process.env.BE_PORT, () => {
    console.log(`Server is running at port ${process.env.BE_PORT}`)
})

connection()