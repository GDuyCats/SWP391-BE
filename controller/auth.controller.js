import { UserModel } from "../postgres/postgres.js"
import bcryptjs from "bcryptjs"

const registerController = async (req, res) => {
    const { username, email, password } = req.body
    const existUser = await UserModel.findOne({ where: { email } })
    if (existUser != null) {
        return res.status(409).json("The user's email is already exist")
    } else {
        const hashedPass = await bcryptjs.hash(password, 10)
        const user = await UserModel.create({
            ...req.body,
            password: hashedPass
        })
        return res.status(201).json(user)
    }
}

const loginController = async (req, res) => {
  const { username, password } = req.body || {};
  try {
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    const user = await UserModel.findOne({ where: { username } });
    if (!user) {
      // thông điệp chung, tránh user enumeration
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isValid = await bcryptjs.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // loại password trước khi trả
    const { password: _pw, ...safeUser } = user.get({ plain: true });
    return res.status(200).json({ message: 'Login success', user: safeUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export { registerController, loginController }