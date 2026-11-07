import { Router } from "express";
import * as categoryController from "../controllers/category.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", categoryController.getAll);
router.post("/", authenticate, requireAdmin, categoryController.create);
router.put("/:id", authenticate, requireAdmin, categoryController.update);
router.delete("/:id", authenticate, requireAdmin, categoryController.remove);

export default router;
