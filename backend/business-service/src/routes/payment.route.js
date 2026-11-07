import { Router } from "express";
import * as paymentController from "../controllers/payment.controller.js";

const router = Router();

router.get("/", paymentController.getPaymentInfo);

export default router;