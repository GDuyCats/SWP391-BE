import { DataTypes } from "sequelize";

export const createUserModel = async (sequelize) => {
    const User = sequelize.define('Users',{
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate : {isEmail: true}
        },
        role: {
            type: DataTypes.ENUM ('admin', 'staff', 'customer'),
            allowNull: false,
            defaultValue: 'customer'
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        refreshtoken: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    })

    return User
}