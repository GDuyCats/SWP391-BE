import express from 'express'
import { connection } from './postgres/postgres.js'
import dotenv from "dotenv";
import router from './routes/routes.js';
import cors from 'cors'
dotenv.config();

const app = express()
app.use(cors())
app.use(express.json())
app.use(router)
app.listen(process.env.BE_PORT, () => {
    console.log(`Server is running at port ${process.env.BE_PORT}`)
})

connection()