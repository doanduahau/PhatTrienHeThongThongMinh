import { Router } from "express";
import * as productController from "../controllers/product.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", productController.getAll);
router.get("/:id", productController.getById);
router.post("/", authenticate, requireAdmin, productController.create);
router.put("/:id", authenticate, requireAdmin, productController.update);
router.delete("/:id", authenticate, requireAdmin, productController.remove);

export default router;
