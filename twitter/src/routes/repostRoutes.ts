import express from "express";
import {repost} from "../controller/repostController.ts";
import {asyncHandler} from "../utils/asyncHandler.ts";


const router = express.Router();

router.post("/", asyncHandler(repost));

export default router;