const mongoose = require('mongoose')

const UserSchema = mongoose.Schema(
    {
        fullname: {
            type: String,
            required: [true, "Please enter your username "],
            trim: true,
        },

        password: {
            type: String,
            required: [true, "Please enter password "]
        },

        role: {
            type: String,
            enum: ["customer", "admin", "staff"],
            default: "customer",
        },

        product: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Products"
            }
        ]
    },
    { timestamps: true }
)
module.exports = mongoose.model("Users", UserSchema);