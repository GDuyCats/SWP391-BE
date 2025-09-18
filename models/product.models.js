const mongoose = require('mongoose')

const ProductSchema = mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            require: true
        },

        productName : {
            type: String,
            require: [true, "Please enter your product's name"]
        },

        brand: {
            type: String,
            require: [true, "Please enter your product's brand"]
        },

        version: {
            type: String,
            require: [true, "Please enter your product's version"]
        }
    }
)

module.exports = mongoose.model("Products", ProductSchema);