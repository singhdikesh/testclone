import express from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { createNotification, getNotification, markNotificationAsRead } from "../controller/notificationController";


const router = express.Router();

router.post("/", asyncHandler(createNotification));
router.get("/", asyncHandler(getNotification));
router.patch("/:id/read", asyncHandler(markNotificationAsRead))

export default router;