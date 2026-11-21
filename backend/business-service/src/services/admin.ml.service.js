import { mlClient } from "../clients/ml.client.js";
import { AppError } from "../utils/AppError.js";

async function request(path, options) {
  const response = await mlClient.adminRequest(path, options);
  if (!response || response.status === 401 || response.status === 403) {
    throw new AppError(
      "Không kết nối được ML service. Kiểm tra dịch vụ và cấu hình ML_INTERNAL_TOKEN.",
      { status: "503", httpStatus: 503 },
    );
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = typeof payload?.detail === "string"
      ? payload.detail
      : "ML service không thể xử lý thao tác.";
    throw new AppError(message, { status: String(response.status), httpStatus: response.status });
  }
  return response;
}

const json = async (path, options) => (await request(path, options)).json();
const dataset = (scope, name) => `datasets/${scope}/${encodeURIComponent(name)}`;

export const listModels = () => json("models");
export const reloadModels = ({ key }) => json("reload", { method: "POST", query: { key } });
export const listDatasets = () => json("datasets");
export const downloadDataset = ({ scope, name }) => request(dataset(scope, name));
export const uploadDataset = ({ name }, body) =>
  json(dataset("uploaded", name), { method: "PUT", body });
export const deleteDataset = ({ name }) => json(dataset("uploaded", name), { method: "DELETE" });
