import express from "express";
import { testController } from "../controllers/test.controller.js"; // Corrected import path

const router = express.Router();

router.get("/", testController);

export default router;
