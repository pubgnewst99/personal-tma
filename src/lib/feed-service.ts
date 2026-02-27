import fs from "fs/promises";
import os from "os";
import path from "path";
import { listContent, type ContentMetadata } from "./indexer";
import { getTodoState, type TodoNode, type TodoState } from "./todo-service";
import { TODO_FILE, validatePath } from "./path-policy";

export type FeedSource = "bacaan" | "idea" | "todo" | "github";
export type FeedEventType = "content_updated" | "todo_added" | "todo_completed" | "github_starred";

export type FeedItem = {
  id: string;
  source: FeedSource;
  type: FeedEventType;
  title: string;
  subtitle?: string;
  timestamp: number;
  meta?: Record<string, string | number | boolean | null>;
};

export type FeedResponse = {
  items: FeedItem[];
  warnings: string[];
  generatedAt: number;
};

type TodoEventType = Extract<FeedEventType, "todo_added" | "todo_completed">;

type TodoSnapshot = {
  unchecked: Record<string, number>;
  checked: Record<string, number>;
  total: Record<string, number>;
  titles: Record<string, string>;
};

type StoredTodoEvent = {
  id: string;
  type: TodoEventType;
  title: string;
  timestamp: number;
};

type TodoFeedLog = {
  version: 1;
  snapshot: TodoSnapshot;
  events: StoredTodoEvent[];
};

type TodoFeedSyncResult = {
  items: FeedItem[];
  warnings: string[];
};

type GitHubStarEntry = {
  starred_at: string;
  repo?: {
    full_name?: string;
    html_url?: string;
  };
};

const MAX_FEED_ITEMS = 30;
const MAX_TODO_EVENTS = 500;
const REMOTE_API_BASE = process.env.FEED_SOURCE_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
let memoryTodoFeedLog: TodoFeedLog | null = null;

function toSourceLabel(source: FeedSource): string {
  if (source === "bacaan") return "Bacaan";
  if (source === "idea") return "Idea";
  if (source === "todo") return "Todo";
  return "GitHub";
}

function buildContentSubtitle(item: ContentMetadata): string {
  const parts: string[] = [toSourceLabel(item.source)];
  if (item.folder) parts.push(item.folder);
  if (item.tags.length > 0) {
    const tags = item.tags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => `#${tag}`)
      .join(" ");
    if (tags) parts.push(tags);
  }
  return parts.join(" • ");
}

function toContentFeedItems(items: ContentMetadata[]): FeedItem[] {
  return items.map((item) => ({
    id: `content:${item.source}:${item.id}:${item.updatedAt}`,
    source: item.source,
    type: "content_updated",
    title: item.title,
    subtitle: buildContentSubtitle(item),
    timestamp: item.updatedAt,
    meta: {
      href: `/content/${item.id}`,
    },
  }));
}

function normalizeTodoText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function incrementCounter(bucket: Record<string, number>, key: string): void {
  bucket[key] = (bucket[key] || 0) + 1;
}

function buildTodoSnapshot(nodes: TodoNode[]): TodoSnapshot {
  const snapshot: TodoSnapshot = {
    unchecked: {},
    checked: {},
    total: {},
    titles: {},
  };

  for (const node of nodes) {
    if (node.type !== "item") continue;
    const normalizedText = normalizeTodoText(node.text);
    const signature = `${node.indent || ""}|${normalizedText}`;

    incrementCounter(snapshot.total, signature);
    if (node.checked) {
      incrementCounter(snapshot.checked, signature);
    } else {
      incrementCounter(snapshot.unchecked, signature);
    }

    if (!snapshot.titles[signature]) {
      snapshot.titles[signature] = normalizedText;
    }
  }

  return snapshot;
}

function resolveTodoFeedLogPath(): string {
  const fallback = path.join(path.dirname(TODO_FILE), ".tma-feed-events.json");
  const configured = process.env.TMA_FEED_LOG_FILE?.replace("~", os.homedir());
  const absolutePath = path.resolve(configured || fallback);
  return validatePath(absolutePath);
}

async function readTodoFeedLog(filePath: string): Promise<TodoFeedLog | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TodoFeedLog>;

    if (
      parsed.version !== 1 ||
      !parsed.snapshot ||
      !parsed.events ||
      !Array.isArray(parsed.events)
    ) {
      throw new Error("Invalid todo feed log schema");
    }

    return {
      version: 1,
      snapshot: {
        unchecked: parsed.snapshot.unchecked || {},
        checked: parsed.snapshot.checked || {},
        total: parsed.snapshot.total || {},
        titles: parsed.snapshot.titles || {},
      },
      events: parsed.events
        .filter((event): event is StoredTodoEvent => {
          return (
            typeof event?.id === "string" &&
            (event?.type === "todo_added" || event?.type === "todo_completed") &&
            typeof event?.title === "string" &&
            typeof event?.timestamp === "number"
          );
        })
        .slice(-MAX_TODO_EVENTS),
    };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeTodoFeedLog(filePath: string, payload: TodoFeedLog): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

function detectTodoEvents(previous: TodoSnapshot, current: TodoSnapshot): StoredTodoEvent[] {
  const signatures = new Set<string>([
    ...Object.keys(previous.total),
    ...Object.keys(current.total),
  ]);

  const now = Date.now();
  const events: StoredTodoEvent[] = [];
  let seq = 0;

  for (const signature of signatures) {
    const previousTotal = previous.total[signature] || 0;
    const currentTotal = current.total[signature] || 0;
    const previousUnchecked = previous.unchecked[signature] || 0;
    const currentUnchecked = current.unchecked[signature] || 0;
    const previousChecked = previous.checked[signature] || 0;
    const currentChecked = current.checked[signature] || 0;

    const addedCount = Math.max(0, currentTotal - previousTotal);
    const completedCount = Math.min(
      Math.max(0, previousUnchecked - currentUnchecked),
      Math.max(0, currentChecked - previousChecked),
    );

    const title = current.titles[signature] || previous.titles[signature] || "Task";

    for (let i = 0; i < addedCount; i += 1) {
      seq += 1;
      events.push({
        id: `todo:add:${signature}:${now}:${seq}`,
        type: "todo_added",
        title,
        timestamp: now,
      });
    }

    for (let i = 0; i < completedCount; i += 1) {
      seq += 1;
      events.push({
        id: `todo:completed:${signature}:${now}:${seq}`,
        type: "todo_completed",
        title,
        timestamp: now,
      });
    }
  }

  return events;
}

function toTodoFeedItems(events: StoredTodoEvent[]): FeedItem[] {
  return events.map((event) => ({
    id: event.id,
    source: "todo",
    type: event.type,
    title: event.title,
    subtitle: event.type === "todo_completed" ? "Task completed" : "Task added",
    timestamp: event.timestamp,
    meta: {
      href: "/todos",
    },
  }));
}

function initializeTodoLog(snapshot: TodoSnapshot): TodoFeedLog {
  return {
    version: 1,
    snapshot,
    events: [],
  };
}

function syncTodoFeedItemsInMemory(state: TodoState): TodoFeedSyncResult {
  const snapshot = buildTodoSnapshot(state.parsed);
  if (!memoryTodoFeedLog) {
    memoryTodoFeedLog = initializeTodoLog(snapshot);
    return { items: [], warnings: ["Todo feed uses in-memory history in this environment."] };
  }

  const newEvents = detectTodoEvents(memoryTodoFeedLog.snapshot, snapshot);
  memoryTodoFeedLog = {
    version: 1,
    snapshot,
    events: [...memoryTodoFeedLog.events, ...newEvents].slice(-MAX_TODO_EVENTS),
  };

  return {
    items: toTodoFeedItems(memoryTodoFeedLog.events),
    warnings: ["Todo feed uses in-memory history in this environment."],
  };
}

function buildRemoteUrl(routePath: string): string {
  if (!REMOTE_API_BASE) {
    throw new Error("Remote API base is not configured.");
  }
  return new URL(routePath, REMOTE_API_BASE).toString();
}

async function fetchRemoteJson<T>(routePath: string): Promise<T> {
  const response = await fetch(buildRemoteUrl(routePath));
  if (!response.ok) {
    throw new Error(`Remote source failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

async function getRemoteContent(source: "bacaan" | "idea"): Promise<ContentMetadata[]> {
  return fetchRemoteJson<ContentMetadata[]>(`/api/content?source=${source}`);
}

async function getRemoteTodoState(): Promise<TodoState> {
  return fetchRemoteJson<TodoState>("/api/todos");
}

async function syncTodoFeedItems(): Promise<TodoFeedSyncResult> {
  const warnings: string[] = [];
  const logPath = resolveTodoFeedLogPath();
  const state = await getTodoState();
  const currentSnapshot = buildTodoSnapshot(state.parsed);

  let existingLog: TodoFeedLog | null = null;
  try {
    existingLog = await readTodoFeedLog(logPath);
  } catch {
    warnings.push("Todo history was reset because the event log was invalid.");
  }

  if (!existingLog) {
    await writeTodoFeedLog(logPath, initializeTodoLog(currentSnapshot));
    return { items: [], warnings };
  }

  const newEvents = detectTodoEvents(existingLog.snapshot, currentSnapshot);
  const mergedEvents = [...existingLog.events, ...newEvents].slice(-MAX_TODO_EVENTS);

  await writeTodoFeedLog(logPath, {
    version: 1,
    snapshot: currentSnapshot,
    events: mergedEvents,
  });

  return { items: toTodoFeedItems(mergedEvents), warnings };
}

async function getGitHubFeedItems(): Promise<TodoFeedSyncResult> {
  const token = process.env.GITHUB_TOKEN;
  const username =
    process.env.GITHUB_USERNAME ||
    process.env.NEXT_PUBLIC_GITHUB_USERNAME ||
    "pubgnewst99";

  try {
    const perPage = Math.max(1, Math.min(Number(process.env.GITHUB_STARS_LIMIT || "30"), 100));
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/starred?sort=created&direction=desc&per_page=${perPage}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/vnd.github.star+json",
          "User-Agent": "personal-tma-feed",
        },
      },
    );

    if (!response.ok) {
      return {
        items: [],
        warnings: token
          ? [`GitHub stars unavailable (${response.status}).`]
          : [`GitHub stars unavailable (${response.status}). Add GITHUB_TOKEN to improve reliability.`],
      };
    }

    const entries = (await response.json()) as GitHubStarEntry[];
    if (!Array.isArray(entries)) {
      return { items: [], warnings: ["GitHub stars returned an unexpected payload."] };
    }

    const items: FeedItem[] = [];
    entries.forEach((entry, index) => {
      const repoName = entry.repo?.full_name;
      const starredAt = new Date(entry.starred_at).getTime();
      if (!repoName || Number.isNaN(starredAt)) return;

      items.push({
        id: `github:star:${repoName}:${starredAt}:${index}`,
        source: "github",
        type: "github_starred",
        title: repoName,
        subtitle: "Starred on GitHub",
        timestamp: starredAt,
        meta: {
          href: entry.repo?.html_url || null,
          repoUrl: entry.repo?.html_url || null,
        },
      });
    });

    return { items, warnings: [] };
  } catch {
    return {
      items: [],
      warnings: ["GitHub stars are temporarily unavailable."],
    };
  }
}

export async function getHomeFeed(): Promise<FeedResponse> {
  const warnings: string[] = [];
  const allItems: FeedItem[] = [];
  let sourceSuccess = 0;

  try {
    allItems.push(...toContentFeedItems(await listContent("bacaan")));
    sourceSuccess += 1;
  } catch {
    try {
      allItems.push(...toContentFeedItems(await getRemoteContent("bacaan")));
      sourceSuccess += 1;
      warnings.push("Bacaan feed is served from remote API.");
    } catch {
      warnings.push("Bacaan feed is unavailable.");
    }
  }

  try {
    allItems.push(...toContentFeedItems(await listContent("idea")));
    sourceSuccess += 1;
  } catch {
    try {
      allItems.push(...toContentFeedItems(await getRemoteContent("idea")));
      sourceSuccess += 1;
      warnings.push("Idea feed is served from remote API.");
    } catch {
      warnings.push("Idea feed is unavailable.");
    }
  }

  try {
    const todo = await syncTodoFeedItems();
    allItems.push(...todo.items);
    warnings.push(...todo.warnings);
    sourceSuccess += 1;
  } catch {
    try {
      const remoteState = await getRemoteTodoState();
      const todo = syncTodoFeedItemsInMemory(remoteState);
      allItems.push(...todo.items);
      warnings.push(...todo.warnings);
      sourceSuccess += 1;
      warnings.push("Todo feed is served from remote API.");
    } catch {
      warnings.push("Todo feed is unavailable.");
    }
  }

  const github = await getGitHubFeedItems();
  allItems.push(...github.items);
  warnings.push(...github.warnings);

  if (sourceSuccess === 0 && allItems.length === 0) {
    throw new Error("No feed sources are available.");
  }

  const items = allItems
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_FEED_ITEMS);

  return {
    items,
    warnings,
    generatedAt: Date.now(),
  };
}
