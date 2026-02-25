import type { ContentMetadata, ContentItem } from "./indexer";
import type { TodoState } from "./todo-service";
import type { FeedResponse } from "./feed-service";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

function buildApiUrl(routePath: string): string {
  if (!API_BASE) return routePath;

  const base = API_BASE.replace(/\/+$/, "");
  if (base.endsWith("/api") && routePath.startsWith("/api/")) {
    return `${base}${routePath.slice(4)}`;
  }
  return `${base}${routePath}`;
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
  getContentList: (source: "bacaan" | "idea") => 
    apiFetch<ContentMetadata[]>(`/api/content?source=${source}`),
  
  getContentDetail: (id: string) => 
    apiFetch<ContentItem>(`/api/content/${id}`),
  
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
