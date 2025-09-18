const express = require('express')
const connectToDb = require('./config/connectToDb.js')

const cors = require('cors')
const app = express()
const usersRoutes = require('./routes/users.routes.js')

connectToDb()

app.use(express.json())
app.use(cors())
app.use(express.urlencoded({ express: false }))
app.use('/users', usersRoutes);
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`)
})
