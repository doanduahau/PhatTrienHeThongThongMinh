import { Router, raw } from "express";
import * as adminMlController from "../controllers/admin.ml.controller.js";
import { authenticate, requireAdmin } from "../middlewares/auth.middleware.js";
import { ML_DATASET_MAX_BYTES } from "../validators/admin.ml.validator.js";

const router = Router();
const datasetBody = raw({
  type: "application/octet-stream",
  limit: ML_DATASET_MAX_BYTES,
  inflate: false,
});

router.use(authenticate, requireAdmin);
router.get("/models", adminMlController.listModels);
router.post("/reload", adminMlController.reloadModels);
router.get("/datasets", adminMlController.listDatasets);
router.get("/datasets/:scope/:name", adminMlController.downloadDataset);
router.put("/datasets/uploaded/:name", datasetBody, adminMlController.uploadDataset);
router.delete("/datasets/uploaded/:name", adminMlController.deleteDataset);

export default router;
