import { Router } from "express";
import * as reviewController from "../controllers/review.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate, requireAdmin);

// GET /api/admin/reviews — bàn moderation toàn cục. Xoá vẫn theo sản phẩm:
// DELETE /api/products/:productId/reviews/:reviewId
router.get("/", reviewController.getAllReviews);

export default router;
