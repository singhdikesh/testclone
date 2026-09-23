import express  from "express";
import { createPost, createReply, getFeed } from "../controller/postController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { upload } from "../middleware/upload.ts";



const router = express.Router();

router.get("/", asyncHandler(getFeed));
router.post("/", upload.single("media"), asyncHandler(createPost));
router.post("/:id/replies", asyncHandler(createReply));


export default router;