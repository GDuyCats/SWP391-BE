const express = require('express')
const mongoose = require('mongoose')
const app = express()
const usersRoutes = require('./routes/users.routes.js')

app.use(express.json())
app.use(express.urlencoded({express : false}))
app.use('/users', usersRoutes);

mongoose.connect('mongodb://localhost:27017/')
    .then(() => {
        console.log("connect to database !")
        app.listen(3000, () => {
            console.log('Server is running on port 3000')
        })
    })
    .catch(() => {
        console.log('Connection failed !')
    })

