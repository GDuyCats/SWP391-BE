import { Sequelize } from "sequelize";
import { createUserModel } from "../model/userSchema.js";
import dotenv from "dotenv";

dotenv.config();
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT,
        port: process.env.DB_PORT
    });
let UserModel = null;
const connection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
        UserModel = await createUserModel(sequelize)
        await sequelize.sync()
        console.log("Database Synced")
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

export {
    connection
}