import express from 'express'
import { connection } from './postgres/postgres.js'

const app = express()

const port = 8000

app.listen(port, () => {
    console.log(`Server is running at port ${port}`)
})

connection()