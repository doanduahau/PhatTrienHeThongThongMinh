import { Router } from "express";
import * as cartController from "../controllers/cart.controller.js";
import * as recommendationController from "../controllers/recommendation.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/", cartController.getCart);
router.get("/suggestions", recommendationController.getCartSuggestions);
router.delete("/", cartController.clear);
router.post("/items", cartController.addItem);
router.put("/items/:productId", cartController.updateItem);
router.delete("/items/:productId", cartController.removeItem);

export default router;
