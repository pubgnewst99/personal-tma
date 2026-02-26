import type { ContentMetadata, ContentItem } from "./indexer";
import type { TodoState } from "./todo-service";
import type { FeedResponse } from "./feed-service";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function buildApiUrl(routePath: string): string {
  // In browser, prefer same-origin API routes to avoid stale external base URL misconfig.
  if (typeof window !== "undefined") {
    return routePath;
  }

  if (!API_BASE) return routePath;

  const base = API_BASE.replace(/\/+$/, "");
  if (base.endsWith("/api") && routePath.startsWith("/api/")) {
    return `${base}${routePath.slice(4)}`;
  }
  return `${base}${routePath}`;
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          const candidate = (entry as { name?: unknown; value?: unknown; label?: unknown });
          if (typeof candidate.name === "string") return candidate.name;
          if (typeof candidate.value === "string") return candidate.value;
          if (typeof candidate.label === "string") return candidate.label;
        }
        return "";
      })
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (typeof raw === "string") {
    return raw
      .split(/[,\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

type ApiContentMetadata = Omit<ContentMetadata, "tags"> & { tags?: unknown; labels?: unknown };

function normalizeContentMetadata(item: ApiContentMetadata): ContentMetadata {
  return {
    ...item,
    tags: normalizeTags(item.tags ?? item.labels),
  };
}

async function extractApiError(response: Response): Promise<string> {
  const fallback = `API Error: ${response.status}`;
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const json = await response.json() as { error?: string; message?: string };
      return json.error || json.message || fallback;
    } catch {
      return fallback;
    }
  }

  const text = (await response.text()).trim();
  if (!text || /^<!doctype html/i.test(text)) {
    return fallback;
  }

  return text.slice(0, 300);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = buildApiUrl(path);
  
  // Get Telegram initData if available
  const initData = typeof window !== "undefined" ? window.Telegram?.WebApp?.initData : "";
  
  const headers = new Headers(options.headers);
  if (initData) {
    headers.set("x-telegram-init-data", initData);
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    throw new Error(await extractApiError(response));
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Unexpected API response from ${url}`);
  }
  
  return response.json();
}

export const apiClient = {
  getContentList: async (source: "bacaan" | "idea") => {
    const list = await apiFetch<ApiContentMetadata[]>(`/api/content?source=${source}`);
    return list.map(normalizeContentMetadata);
  },
  
  getContentDetail: async (id: string) => {
    const detail = await apiFetch<Omit<ContentItem, "metadata"> & { metadata: ApiContentMetadata }>(`/api/content/${id}`);
    return {
      ...detail,
      metadata: normalizeContentMetadata(detail.metadata),
    };
  },
  
  getTodos: () => 
    apiFetch<TodoState>("/api/todos"),
  
  toggleTodo: (id: number, checked: boolean, revision: string) => 
    apiFetch<TodoState>("/api/todos/toggle", {
      method: "PATCH",
      body: JSON.stringify({ id, checked, revision }),
      headers: { "Content-Type": "application/json" }
    }),

  getFeed: () =>
    apiFetch<FeedResponse>("/api/feed"),

  getAssetUrl: (filePath: string, source: "bacaan" | "idea") => {
    // Return the full URL for the asset serving endpoint
    const url = new URL(`${API_BASE}/api/assets`, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    url.searchParams.set("path", filePath);
    url.searchParams.set("source", source);
    return url.toString();
  }
};
