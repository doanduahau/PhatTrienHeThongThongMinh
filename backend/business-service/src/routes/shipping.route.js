import { Router } from "express";
import * as shippingController from "../controllers/shipping.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Có token admin -> thấy cả phương thức đã tắt
router.get("/", (req, res, next) => {
  if (!req.headers.authorization) return next();
  return authenticate(req, res, () => next());
}, shippingController.getAll);

router.post("/", authenticate, requireAdmin, shippingController.create);
router.put("/:id", authenticate, requireAdmin, shippingController.update);
router.delete("/:id", authenticate, requireAdmin, shippingController.remove);

export default router;
