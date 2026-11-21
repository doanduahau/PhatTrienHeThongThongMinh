import { z } from "zod";

export const ML_DATASET_MAX_BYTES = 10 * 1024 * 1024;

const datasetName = z.string().regex(
  /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.csv$/i,
  "Tên tệp CSV chỉ gồm chữ không dấu, số, dấu chấm, gạch nối và gạch dưới.",
);

export const datasetParamSchema = z.object({
  scope: z.enum(["original", "uploaded"]),
  name: datasetName,
});

export const uploadedDatasetParamSchema = z.object({ name: datasetName });
export const reloadQuerySchema = z.object({
  key: z.enum(["featured", "similar", "bundles", "personalized", "search"]).optional(),
});

export const datasetBodySchema = z.custom(
  (body) => Buffer.isBuffer(body) && body.length > 0,
  "Chọn một tệp CSV có dữ liệu.",
);
