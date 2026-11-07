import { Router } from "express";
import * as brandController from "../controllers/brand.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", brandController.getAll);
router.get("/:id", brandController.getById);
router.post("/", authenticate, requireAdmin, brandController.create);
router.put("/:id", authenticate, requireAdmin, brandController.update);
router.delete("/:id", authenticate, requireAdmin, brandController.remove);

export default router;
