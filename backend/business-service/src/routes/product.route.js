import { Router } from "express";
import * as productController from "../controllers/product.controller.js";
import * as recommendationController from "../controllers/recommendation.controller.js";
import * as ratingController from "../controllers/rating.controller.js";
import * as reviewController from "../controllers/review.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", productController.getAll);
// Phải khai báo trước "/:id" để không bị hiểu là id = "search"
router.get("/search/smart", recommendationController.smartSearch);
router.get("/:id/similar", recommendationController.getSimilar);
router.get("/:id/rating", ratingController.getSummary);
router.post("/:id/rating", authenticate, ratingController.rateProduct);
router.delete("/:id/rating", authenticate, ratingController.removeRating);
router.get("/:id/reviews", reviewController.getReviews);
router.post("/:id/reviews", authenticate, reviewController.createOrUpdate);
router.delete("/:id/reviews", authenticate, reviewController.removeReview);
router.get("/:id", productController.getById);
router.post("/", authenticate, requireAdmin, productController.create);
router.put("/:id", authenticate, requireAdmin, productController.update);
router.delete("/:id", authenticate, requireAdmin, productController.remove);

export default router;
