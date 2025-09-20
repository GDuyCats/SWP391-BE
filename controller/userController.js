import { UserModel } from "../postgres/postgres.js"

const getUsers = async (req, res) => {
    try {
        const users = await UserModel.findAll()
        if (users.length === 0) {
            return res.status(200).json({ message : 'There is no user' })
        }
        return res.status(200).json(users)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

const createUsers = async (req, res) => {
    const { name, email, userID } = req.body;
    try {
        const user = await UserModel.findOne({ where: { userID: userID } })
        if(user === null){
            await UserModel.create(req.body);
            return res.status(201).json({message: 'The user have been added successfully'})
        }
        return res.status(200).json({message: 'The user is already created'})
    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: 'Internal server error' })
    }
}

export { getUsers, createUsers };