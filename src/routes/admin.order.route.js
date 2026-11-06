import { Router } from "express";
import * as orderController from "../controllers/order.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", orderController.getAllOrders);
router.patch("/:id/status", orderController.updateStatus);

export default router;
