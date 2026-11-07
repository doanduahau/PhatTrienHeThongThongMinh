import { Router } from "express";
import * as recommendationController from "../controllers/recommendation.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/featured", recommendationController.getFeatured);
router.get("/for-you", authenticate, recommendationController.getForYou);
router.get("/ml-status", authenticate, requireAdmin, recommendationController.getMlStatus);

export default router;
