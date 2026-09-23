import express from "express";
import { login } from "../controller/loginController.ts";
import { createUser } from "../controller/userController.ts";
import { googleLogin, verifyEmail } from "../controller/authController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();

router.post("/login", asyncHandler(login));
router.post("/register", asyncHandler(createUser));
router.get("/verify-email", asyncHandler(verifyEmail));
router.post("/google", asyncHandler(googleLogin));

export default router;