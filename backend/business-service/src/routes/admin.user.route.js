import { Router } from "express";
import * as adminUserController from "../controllers/admin.user.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", adminUserController.getUsers);
router.patch("/:id/lock", adminUserController.setLock);
router.patch("/:id/role", adminUserController.setRole);

export default router;