import express from "express";
import { search } from "../controller/searchController.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

const router = express.Router();


router.get("/", asyncHandler(search));


export default router;