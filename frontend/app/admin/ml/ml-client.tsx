"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { api } from "@/lib/api";
import { dateTime } from "@/lib/format";
import type { MlDataset, MlModel, MlStatus } from "@/lib/types";
import { useStore } from "@/components/store";
import { Button } from "@/components/ui";
import { Cell, ErrorNote, Note, Pill, Row, SectionHead, Table, errorMessage } from "@/components/admin/ui";

const MAX_BYTES = 10 * 1024 * 1024;
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

function fileSize(bytes: number | null | undefined) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${number.format(bytes / 1024)} KB`;
  return `${number.format(bytes / 1024 ** 2)} MB`;
}

export default function AdminMlClient() {
  const { toast } = useStore();
  const [status, setStatus] = useState<MlStatus | null>(null);
  const [models, setModels] = useState<MlModel[] | null>(null);
  const [datasets, setDatasets] = useState<MlDataset[] | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    const [health, modelList, datasetList] = await Promise.allSettled([
      api.admin.mlStatus(),
      api.admin.mlModels(),
      api.admin.mlDatasets(),
    ]);
    setStatus(health.status === "fulfilled" ? health.value : null);
    setStatusError(health.status === "rejected" ? errorMessage(health.reason, "Không kiểm tra được ML service.") : null);
    setModels(modelList.status === "fulfilled" ? modelList.value.models : null);
    setModelError(modelList.status === "rejected" ? errorMessage(modelList.reason, "Không lấy được danh sách model.") : null);
    setDatasets(datasetList.status === "fulfilled" ? datasetList.value.datasets : null);
    setDatasetError(datasetList.status === "rejected" ? errorMessage(datasetList.reason, "Không lấy được danh sách tệp.") : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void check());
  }, [check]);

  const reload = async (key: string) => {
    setAction(key);
    setModelError(null);
    try {
      const result = await api.admin.reloadMl(key);
      setModels(result.models);
      if (result.reloaded) {
        toast("Đã nạp lại model.");
      } else {
        setModelError("Model nạp thất bại. Xem lỗi trong danh sách bên dưới.");
      }
    } catch (err) {
      setModelError(errorMessage(err, "Không nạp lại được model."));
    } finally {
      setAction(null);
    }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size === 0) {
      setDatasetError("Chọn một tệp CSV có dữ liệu.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setDatasetError("Tệp CSV tối đa 10 MB.");
      return;
    }

    setAction("upload");
    setDatasetError(null);
    try {
      const dataset = await api.admin.uploadMlDataset(file);
      setDatasets((items) => [...(items ?? []), dataset]);
      toast("Đã tải tệp CSV lên ML service.");
    } catch (err) {
      setDatasetError(errorMessage(err, "Không tải tệp CSV lên được."));
    } finally {
      setAction(null);
    }
  };

  const remove = async (dataset: MlDataset) => {
    if (!window.confirm(`Xóa tệp ${dataset.name} khỏi ML service?`)) return;
    setAction(`delete:${dataset.name}`);
    setDatasetError(null);
    try {
      await api.admin.deleteMlDataset(dataset.name);
      setDatasets((items) => items?.filter(
        (item) => item.scope !== dataset.scope || item.name !== dataset.name,
      ) ?? null);
      toast("Đã xóa tệp CSV.");
    } catch (err) {
      setDatasetError(errorMessage(err, "Không xóa được tệp CSV."));
    } finally {
      setAction(null);
    }
  };

  const disabled = loading || action !== null;

  return (
    <div className="min-w-0 space-y-6">
      <section aria-label="Trạng thái ML service" className="rounded-card border border-line bg-bg p-5">
        <div className="flex flex-wrap items-center gap-3">
          {loading ? (
            <p className="text-sm text-muted" role="status">Đang kiểm tra…</p>
          ) : status?.online ? (
            <Pill tone="ok">ML service đang chạy</Pill>
          ) : (
            <Pill tone="bad">Không kết nối được ML service</Pill>
          )}
          {status?.detail?.version ? (
            <span className="text-sm text-muted">Bản {status.detail.version}</span>
          ) : null}
          <span className="text-sm text-muted">{status?.serviceUrl}</span>
          <Button className="ml-auto" type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => void check()}>
            Kiểm tra lại
          </Button>
        </div>
        {statusError ? <div className="mt-3"><ErrorNote message={statusError} /></div> : null}
      </section>

      <section aria-label="Tệp dữ liệu - CSV" className="space-y-4 rounded-card border border-line bg-bg p-5">
        <SectionHead title="Tệp dữ liệu - CSV" />
        <input
          className="block w-full rounded-btn border border-line px-3 py-2 text-sm file:mr-3 file:font-medium file:text-accent"
          type="file"
          accept=".csv,text/csv"
          aria-label="Chọn tệp CSV"
          aria-describedby="dataset-help"
          disabled={disabled || datasets === null}
          onChange={upload}
        />
        {action === "upload" ? <p role="status" className="text-sm text-muted">Đang tải lên…</p> : null}
        <p id="dataset-help" className="text-sm text-muted">
          Tệp tự tải lên sau khi chọn. Dùng CSV UTF-8 phân cách bằng dấu phẩy, tối đa 10 MB.
        </p>
        <ErrorNote message={datasetError} />
        {datasets?.length ? (
          <Table head={["Tệp", "Nguồn", "Dung lượng", "Cập nhật", "Thao tác"]}>
            {datasets.map((dataset) => (
              <Row key={`${dataset.scope}/${dataset.name}`}>
                <Cell className="break-all font-medium">{dataset.name}</Cell>
                <Cell className="whitespace-nowrap text-muted">
                  {dataset.scope === "uploaded" ? "Đã tải lên" : "Có sẵn"}
                </Cell>
                <Cell className="whitespace-nowrap text-muted">{fileSize(dataset.size_bytes)}</Cell>
                <Cell className="whitespace-nowrap text-muted">{dateTime(dataset.modified_at)}</Cell>
                <Cell>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <a href={api.admin.mlDatasetUrl(dataset)} download={dataset.name} className="text-accent hover:underline">
                      Tải xuống
                    </a>
                    {dataset.scope === "uploaded" ? (
                      <button
                        type="button"
                        className="text-danger hover:underline disabled:opacity-50"
                        aria-label={`Xóa ${dataset.name}`}
                        disabled={disabled}
                        onClick={() => void remove(dataset)}
                      >
                        {action === `delete:${dataset.name}` ? "Đang xóa…" : "Xóa"}
                      </button>
                    ) : null}
                  </div>
                </Cell>
              </Row>
            ))}
          </Table>
        ) : datasets ? <Note>Chưa có tệp dữ liệu.</Note> : null}
      </section>

      <section aria-label="Model đã huấn luyện" className="space-y-4 rounded-card border border-line bg-bg p-5">
        <SectionHead title="Model đã huấn luyện" />
        <ErrorNote message={modelError} />
        {models?.length ? (
          <Table head={["Model", "Bản trên đĩa", "Trạng thái", "Nạp lúc", "Thao tác"]}>
            {models.map((model) => (
              <Row key={model.key}>
                <Cell>
                  <p className="font-medium">{model.label}</p>
                  <p className="mt-1 break-all text-xs text-muted">{model.path}</p>
                </Cell>
                <Cell>
                  <p className="whitespace-nowrap">{model.manifest?.version ?? "—"}</p>
                  <p className="mt-1 whitespace-nowrap text-xs text-muted">
                    {fileSize(model.size_bytes)}
                    {model.manifest?.trained_at
                      ? ` · ${dateTime(model.manifest.trained_at)}`
                      : model.modified_at ? ` · ${dateTime(model.modified_at)}` : ""}
                  </p>
                  {model.manifest?.metrics && Object.keys(model.manifest.metrics).length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-accent">Chỉ số huấn luyện</summary>
                      <pre className="mt-2 max-h-48 max-w-xs overflow-auto whitespace-pre-wrap break-words rounded-btn bg-subtle p-2 text-xs">
                        {JSON.stringify(model.manifest.metrics, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </Cell>
                <Cell>
                  <Pill tone={model.loaded && !model.error ? "ok" : "bad"}>
                    {model.error && model.loaded ? "Đang dùng bản cũ" : model.loaded ? "Đã nạp" : model.exists ? "Chưa nạp" : "Thiếu tệp"}
                  </Pill>
                  {model.error ? <p className="mt-2 max-w-xs break-words text-xs text-danger">{model.error}</p> : null}
                </Cell>
                <Cell className="whitespace-nowrap text-muted">{model.loaded_at ? dateTime(model.loaded_at) : "—"}</Cell>
                <Cell>
                  <Button type="button" size="sm" variant="ghost" disabled={disabled || !model.exists} onClick={() => void reload(model.key)}>
                    {action === model.key ? "Đang nạp…" : "Nạp lại"}
                  </Button>
                </Cell>
              </Row>
            ))}
          </Table>
        ) : models ? <Note>Chưa có thông tin model.</Note> : null}
      </section>
    </div>
  );
}
