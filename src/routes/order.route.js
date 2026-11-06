import { Router } from "express";
import * as orderController from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/", orderController.checkout);
router.get("/", orderController.getMyOrders);
router.get("/:id", orderController.getMyOrderById);
router.patch("/:id/cancel", orderController.cancelMyOrder);

export default router;
