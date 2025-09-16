const mongoose = require('mongoose')

const UserSchema = mongoose.Schema(
    {
        fullname: {
            type: String,
            required: [true, "Please enter your username "],
            trim: true,
        },

        // email: {
        //     type: String,
        //     required: [true, "Please enter email"],
        //     unique: true,
        //     lowercase: true,
        // },

        password: {
            type: String,
            required: [true, "Please enter password "]
        },

        role: {
            type: String,
            enum: ["customer", "admin", "staff"],
            default: "customer",
        },

        // phone: {
        //     type: String,
        // },

        // avatar: {
        //     type: String,
        // },
    },
    { timestamps: true }
)
module.exports = mongoose.model("Users", UserSchema);