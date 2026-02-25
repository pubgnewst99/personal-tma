import type { ContentMetadata, ContentItem } from "./indexer";
import type { TodoState } from "./todo-service";
import type { FeedResponse } from "./feed-service";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  
  // Get Telegram initData if available
  const initData = typeof window !== "undefined" ? window.Telegram?.WebApp?.initData : "";
  
  const headers = new Headers(options.headers);
  if (initData) {
    headers.set("x-telegram-init-data", initData);
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `API Error: ${response.status}`);
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
