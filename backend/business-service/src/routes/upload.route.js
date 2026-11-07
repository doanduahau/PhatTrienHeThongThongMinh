import { Router } from "express";
import * as uploadController from "../controllers/upload.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";
import { handleImageUpload } from "../middlewares/upload.middleware.js";

const router = Router();

router.post("/", authenticate, requireAdmin, handleImageUpload, uploadController.upload);

export default router;