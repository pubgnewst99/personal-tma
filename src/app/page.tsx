"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import type { FeedItem, FeedResponse } from "@/lib/feed-service";
import { Loader2, BookOpen, Lightbulb, CheckSquare, Star } from "lucide-react";

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFeedIcon(item: FeedItem) {
  if (item.source === "bacaan") return BookOpen;
  if (item.source === "idea") return Lightbulb;
  if (item.source === "todo") return CheckSquare;
  return Star;
}

function getFeedBadge(item: FeedItem): string {
  if (item.type === "todo_added") return "TODO • ADDED";
  if (item.type === "todo_completed") return "TODO • DONE";
  if (item.type === "github_starred") return "GITHUB • STARRED";
  return `${item.source.toUpperCase()} • UPDATED`;
}

export default function Home() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getFeed()
      .then(setFeed)
      .catch((err: unknown) => {
        console.error("Fetch error:", err);
        const message = err instanceof Error ? err.message : "Failed to load feed";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-tg-text mb-2 tracking-tight">Personal OS</h1>
        <p className="text-tg-hint leading-relaxed italic text-sm">
          A unified feed from Bacaan, Ideas, Todos, and GitHub stars.
        </p>
      </header>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : error ? (
        <div className="py-20 text-center">
          <p className="text-red-500 text-sm mb-4">Failed to load content: {error}</p>
          <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-tg-hint text-left font-mono break-all">
            API_URL: {process.env.NEXT_PUBLIC_API_BASE_URL || "(not set)"}
          </div>
        </div>
      ) : feed ? (
        <div className="space-y-5">
          {feed.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              {feed.warnings.map((warning) => (
                <div key={warning}>• {warning}</div>
              ))}
            </div>
          )}

          {feed.items.length === 0 ? (
            <div className="py-20 text-center text-tg-hint text-sm">
              No recent activity yet.
            </div>
          ) : (
            <div className="space-y-3">
              {feed.items.map((item) => {
                const Icon = getFeedIcon(item);

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-black/5 dark:border-white/10 bg-tg-secondary p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-xl bg-accent/10 p-2 text-accent">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 text-[10px] uppercase tracking-wider text-accent font-semibold">
                          {getFeedBadge(item)}
                        </div>
                        <h2 className="text-sm font-semibold text-tg-text leading-snug break-words">
                          {item.title}
                        </h2>
                        {item.subtitle && (
                          <p className="mt-1 text-xs text-tg-hint break-words">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      <time className="text-[10px] whitespace-nowrap text-tg-hint pl-2">
                        {formatTimestamp(item.timestamp)}
                      </time>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
