import express from "express"
import { getUsers, createUsers, updateUsers, deleteUsers } from "../controller/admin.user.controller.js";

const router = express.Router();

router.get('/', getUsers)
router.post('/', createUsers)
router.put('/:id', updateUsers)
router.delete('/:id', deleteUsers)

export default router
