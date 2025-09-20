import express from "express"
import { getUsers, createUsers } from "../controller/userController.js";

const router = express.Router();

router.get('/', getUsers)
router.post('/', createUsers)

export default router
