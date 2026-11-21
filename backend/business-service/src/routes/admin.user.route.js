import { Router } from "express";
import * as adminUserController from "../controllers/admin.user.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", adminUserController.getUsers);
router.post("/", adminUserController.createUser);
router.patch("/:id/lock", adminUserController.setLock);
router.patch("/:id/role", adminUserController.setRole);
// Admin đặt lại mật khẩu hộ khách, không cần mật khẩu hiện tại
router.post("/:id/reset-password", adminUserController.resetPassword);
router.delete("/:id", adminUserController.removeUser);

export default router;