import { DataTypes } from "sequelize";

export const createUserModel = async (sequelize) => {
    const User = sequelize.define('Users', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        phone: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            validate: {
                is: /^(?:\+84|0)(?:\d{9,10})$/,
            },
        },

        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },

        avatar: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        role: {
            type: DataTypes.ENUM('admin', 'staff', 'customer'),
            allowNull: false,
            defaultValue: 'customer'
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        refreshToken: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        tokenVersion: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        }
    })

    return User
}