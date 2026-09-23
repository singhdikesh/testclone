import express  from "express";
import { createPost, createReply, getFeed } from "../controller/postController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";



const router = express.Router();

router.get("/", asyncHandler(getFeed));
router.post("/", asyncHandler(createPost));
router.post("/:id/replies", asyncHandler(createReply));


export default router;