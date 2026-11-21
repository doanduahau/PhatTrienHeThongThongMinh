import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as service from "../services/admin.ml.service.js";
import { sendSuccess, sendError, sendAppError } from "../utils/response.js";
import {
  datasetBodySchema,
  datasetParamSchema,
  reloadQuerySchema,
  uploadedDatasetParamSchema,
} from "../validators/admin.ml.validator.js";
import { validateInput } from "../validators/validate.js";

function validate(res, schema, input) {
  const result = validateInput(schema, input);
  if (!result.success) {
    sendError(res, result.errors[0].message, "400", result.errors, 400);
    return null;
  }
  return result.data;
}

const respond = (action) => async (_req, res) => {
  try {
    return sendSuccess(res, await action());
  } catch (error) {
    return sendAppError(res, error, "Không lấy được thông tin từ ML service.");
  }
};

export const listModels = respond(service.listModels);
export const listDatasets = respond(service.listDatasets);

export const reloadModels = async (req, res) => {
  const query = validate(res, reloadQuerySchema, req.query);
  if (!query) return;
  try {
    return sendSuccess(res, await service.reloadModels(query));
  } catch (error) {
    return sendAppError(res, error, "Nạp lại model thất bại.");
  }
};

export const uploadDataset = async (req, res) => {
  const params = validate(res, uploadedDatasetParamSchema, req.params);
  if (!params) return;
  if (!req.is("application/octet-stream")) {
    return sendError(res, "Yêu cầu phải chứa nội dung tệp CSV.", "415", null, 415);
  }
  const body = validate(res, datasetBodySchema, req.body);
  if (!body) return;
  try {
    return sendSuccess(res, await service.uploadDataset(params, body));
  } catch (error) {
    return sendAppError(res, error, "Tải tệp CSV lên thất bại.");
  }
};

export const deleteDataset = async (req, res) => {
  const params = validate(res, uploadedDatasetParamSchema, req.params);
  if (!params) return;
  try {
    return sendSuccess(res, await service.deleteDataset(params));
  } catch (error) {
    return sendAppError(res, error, "Xóa tệp CSV thất bại.");
  }
};

export const downloadDataset = async (req, res) => {
  const params = validate(res, datasetParamSchema, req.params);
  if (!params) return;
  try {
    const upstream = await service.downloadDataset(params);
    res.attachment(params.name);
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Cache-Control", "private, no-store");
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch (error) {
    if (!res.headersSent && !res.destroyed) {
      return sendAppError(res, error, "Tải tệp CSV xuống thất bại.");
    }
  }
};
