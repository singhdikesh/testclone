import express from "express";
import {follower, unfollow, follow, toggleFollow, getFollowingStatus} from "../controller/followController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";


const router = express.Router();


router.get("/", asyncHandler(follower));
router.delete("/", asyncHandler(unfollow));
router.post("/follow", asyncHandler(follow));
router.post("/", asyncHandler(toggleFollow));
router.post("/status", asyncHandler(getFollowingStatus));

export default router;