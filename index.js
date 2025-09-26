import express from 'express'
import dotenv from "dotenv";
import cors from 'cors'
import nodemailer from 'nodemailer'
import { connection } from './postgres/postgres.js'

import admin_routes from './routes/admin.routes.js';
import auth_routes from './routes/auth.routes.js'
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express()
const transporter = nodemailer.createTransport({
    service: "gmail",
    host: 'smtp.gmail.com',
    secure: false,
    port: 587,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
})

app.use(cookieParser())
app.use(cors())
app.use(express.json())
app.use(admin_routes)
app.use(auth_routes)

app.get('/email', (req, res ) => {
    res.send('Hello')

    const mailOptions = {
        from: process.env.EMAIL,
        to: process.env.EMAIL,
        subject: 'Sending Email using Node.js',
        text: 'That was easy !'
    }

    transporter.sendMail(mailOptions, (error, info) => {
        if(error){
            console.log(error)
        } else {
            console.log('Email Send : ' + info.response)
        }
    })
})

app.listen(process.env.BE_PORT, () => {
    console.log(`Server is running at port ${process.env.BE_PORT}`)
})

connection()