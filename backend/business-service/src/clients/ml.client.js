import { env } from "../config/env.js";

/**
 * HTTP client nội bộ tới ML service (FastAPI).
 *
 * Nguyên tắc:
 * - Timeout ngắn để không làm chậm API nghiệp vụ.
 * - Mọi lỗi (ML tắt, timeout, 4xx/5xx) trả `null`; service gọi tự fallback.
 * - Không retry nhiều lần: ML là thành phần phụ, ưu tiên độ trễ của backend.
 */

const buildUrl = (path, query) => {
  const url = new URL(path, env.mlServiceUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url;
};

const request = async (path, { method = "GET", body, query, timeoutMs = env.mlTimeoutMs } = {}) => {
  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(env.mlInternalToken ? { "X-Internal-Token": env.mlInternalToken } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.warn(`[ML] ${method} ${path} -> ${response.status}: ${detail.slice(0, 200)}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`[ML] ${method} ${path} thất bại: ${error.message}`);
    return null;
  }
};

export const mlClient = {
  serviceUrl: env.mlServiceUrl,

  health: () => request("/health", { timeoutMs: 800 }),

  similarProducts: (productId, topN = 8) =>
    request("/recommend/similar", {
      method: "POST",
      body: { product_id: productId, top_n: topN },
    }),

  bundles: (productIds, topN = 6) =>
    request("/recommend/bundles", {
      method: "POST",
      body: { product_ids: productIds, top_n: topN },
    }),

  personalized: (userId, topN = 8) =>
    request("/recommend/personalized", {
      method: "POST",
      body: { user_id: userId, top_n: topN },
    }),

  featured: (categoryId = undefined, limit = 10) =>
    request("/ranking/featured", { query: { category_id: categoryId, limit } }),

  parseSearch: (query) =>
    request("/search/parse", { method: "POST", body: { query } }),
};

export default mlClient;
