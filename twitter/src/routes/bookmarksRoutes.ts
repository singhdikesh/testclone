import express from "express";
import { getBookmark, createBookmark, removeBookmark } from "../controller/bookmarkController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.post("/", asyncHandler(createBookmark));
router.get("/", asyncHandler(getBookmark));
router.delete("/:id", asyncHandler(removeBookmark));


export default router;