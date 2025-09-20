import { DataTypes } from "sequelize";

export const createUserModel = async (sequelize) => {
    const User = sequelize.define('Users',{
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            isLowercase: true,
            unique: true
        },
        userID: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    })

    return User
}