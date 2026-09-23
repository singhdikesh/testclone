import express from "express"
import {likePost, getLikes} from "../controller/likeController.ts";
import {asyncHandler} from "../utils/asyncHandler.ts";

const router = express.Router();

router.post("/", asyncHandler(likePost));
router.get("/", asyncHandler(getLikes));


export default router;