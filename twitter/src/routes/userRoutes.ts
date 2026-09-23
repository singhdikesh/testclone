import express from "express";
import { getAllUsers, createUser, updateUserById, getUserById, deleteUserById } from "../controller/userController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
const router = express.Router();

router.get("/", asyncHandler(getAllUsers));
router.get("/:id", asyncHandler(getUserById));
router.put("/:id", asyncHandler(updateUserById));
router.delete("/:id", asyncHandler(deleteUserById));
router.post("/", asyncHandler(createUser));

export default router;
