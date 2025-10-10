import { Router } from "express";
import { listAdvancedPublicPosts } from "../controller/post.public.controller.js"

const router = Router();

// GET /api/posts/public?q=iphone&page=1&pageSize=12
router.get("/", listAdvancedPublicPosts);

export default router;