import express from 'express'
import dotenv from "dotenv";
import cors from 'cors'
import fs from 'fs'
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { connection } from './postgres/postgres.js'
import Mail from './utils/mail.js'
import admin_routes from './routes/admin.routes.js';
import auth_routes from './routes/auth.routes.js'
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

const app = express()
app.use(cookieParser())
app.use(cors())
app.use(express.json())
app.use(admin_routes)
app.use(auth_routes)

app.post('/email', async (req, res) => {
    let { receiver_id, subject, text, email } = req.body
    let htmldata = fs.readFileSync(path.join(__dirname, 'mail.html'), 'utf-8')
    htmldata = htmldata.replace('[Email]', email)
    console.log(htmldata)
    const mail = new Mail()
    mail.setTo(receiver_id)
    mail.setSubject(subject)
    mail.setText(text)
    mail.setHTML(htmldata)
    mail.send()
    res.send('Email sent!')
})

app.listen(process.env.BE_PORT, () => {
    console.log(`Server is running at port ${process.env.BE_PORT}`)
})

connection()