import { UserModel } from "../postgres/postgres.js"

const getUsers = async (req, res) => {
    try {
        const users = await UserModel.findAll()
        if (users.length === 0) {
            return res.status(200).json({ message: 'There is no user' })
        }
        return res.status(200).json(users)
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: error.message || 'Internal server error'
        })
    }
}

const createUsers = async (req, res) => {
    const { username, email, password, role } = req.body;
    try {
        const user = await UserModel.findOne({ where: { email } })
        if (user === null) {
            await UserModel.create(req.body);
            return res.status(201).json({ message: 'The user have been added successfully' })
        }
        return res.status(409).json({ message: "The user's email is already exist" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: error.message || 'Internal server error'
        })
    }
}

const updateUsers = async (req, res) => {
    const { id } = req.params
    try {
        const user = await UserModel.update(req.body, { where: { id } })
        if (user[0] === 0) {
            return res.status(404).json({ message: "User are not found" });
        }
        return res.status(200).json({ message: "User are updated successfully !" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            error: error.message || 'Internal server error'
        })
    }
}

const deleteUsers = async (req, res) => {
    const { id } = req.params
    try {
        const user = await UserModel.findOne({ where: { id } })
        if (user === null) {
            return res.status(404).json({ message: " User are not found" })
        }
        await user.destroy()
        return res.status(200).json({ message: "User are deleted successfully " })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ 
            error: error.message || 'Internal server error'
        })
    }
}

const getAdminDashboard = (req, res) => {
  console.log("✅ Admin đã truy cập vào dashboard");
  console.log("Thông tin user từ token:", req.user);

  return res.json({
    message: "Bạn đã vào được trang admin!",
    user: req.user,
  });
};

export { getUsers, createUsers, updateUsers, deleteUsers, getAdminDashboard };