import { Router } from "express";
import * as statsController from "../controllers/stats.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/overview", statsController.getOverview);
router.get("/revenue", statsController.getRevenue);
router.get("/top-products", statsController.getTopProducts);
router.get("/low-stock", statsController.getLowStock);

export default router;