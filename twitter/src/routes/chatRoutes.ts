import express from "express";
import { asyncHandler } from "../utils/asyncHandler.ts";
import {
    createDirectConversation,
    getConversationMessages,
    getConversations,
    markConversationRead,
} from "../controller/chatController.ts";

const router = express.Router();

router.get("/conversations", asyncHandler(getConversations));
router.post("/conversations", asyncHandler(createDirectConversation));
router.get("/conversations/:id/messages", asyncHandler(getConversationMessages));
router.post("/conversations/:id/read", asyncHandler(markConversationRead));

export default router;
