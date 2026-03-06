"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import type { FeedItem, FeedResponse } from "@/lib/feed-service";
import { Loader2, BookOpen, Lightbulb, CheckSquare, Star, Search, X } from "lucide-react";

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

function getFeedHref(item: FeedItem): string | null {
  const href = item.meta?.href;
  if (typeof href === "string" && href) return href;

  const repoUrl = item.meta?.repoUrl;
  if (typeof repoUrl === "string" && repoUrl) return repoUrl;

  return null;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state with URL params
  const filter = (searchParams.get("filter") as any) || "all";
  const searchQuery = searchParams.get("q") || "";

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

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "all" || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = (feed?.items || []).filter(item => {
    // 1. Source filter
    if (filter !== "all" && item.source !== filter) return false;

    // 2. Search query filter
    if (normalizedQuery) {
      const haystack = `${item.title} ${item.subtitle || ""}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-tg-text mb-2 tracking-tight">Personal OS</h1>
        <p className="text-tg-hint leading-relaxed italic text-sm">
          A unified feed from Bacaan, Ideas, Todos, and GitHub stars.
        </p>

        {!loading && !error && feed && (
          <div className="mt-6 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {["all", "bacaan", "idea", "todo", "github"].map((f) => (
                <button
                  key={f}
                  onClick={() => updateParams({ filter: f })}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f
                    ? "bg-accent text-white"
                    : "bg-black/5 dark:bg-white/5 text-tg-hint hover:text-tg-text"
                    }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint pointer-events-none"
              />
              <input
                value={searchQuery}
                onChange={(e) => updateParams({ q: e.target.value })}
                placeholder="Search activity..."
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 pl-9 pr-9 py-2 text-sm text-tg-text placeholder:text-tg-hint outline-none focus:ring-2 focus:ring-accent/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => updateParams({ q: null })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-tg-hint transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
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
        <div className="space-y-3">
          {feed.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              {feed.warnings.map((warning) => (
                <div key={warning}>• {warning}</div>
              ))}
            </div>
          )}

          {filteredItems.length === 0 ? (
            <div className="py-20 text-center text-tg-hint text-sm opacity-50 space-y-2">
              <div className="text-3xl">📭</div>
              <p>No activity found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredItems
                .map((item) => {
                  const Icon = getFeedIcon(item);
                  const href = getFeedHref(item);
                  const isExternal = Boolean(href && /^https?:\/\//i.test(href));

                  const content = (
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 rounded-lg bg-accent/10 p-1.5 text-accent">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 text-[9px] uppercase tracking-[0.08em] text-accent font-semibold">
                          {getFeedBadge(item)}
                        </div>
                        <h2 className="text-[13px] font-semibold text-tg-text leading-snug break-words">
                          {item.title}
                        </h2>
                        {item.subtitle && (
                          <p className="mt-0.5 text-[11px] text-tg-hint break-words">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                      <time className="text-[10px] whitespace-nowrap text-tg-hint pl-1">
                        {formatTimestamp(item.timestamp)}
                      </time>
                    </div>
                  );

                  return (
                    <article
                      key={item.id}
                      className="rounded-xl border border-black/5 dark:border-white/10 bg-tg-secondary/55"
                    >
                      {href ? (
                        isExternal ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="block px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-xl"
                          >
                            {content}
                          </a>
                        ) : (
                          <Link
                            href={href}
                            className="block px-3 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-xl"
                          >
                            {content}
                          </Link>
                        )
                      ) : (
                        <div className="px-3 py-2.5">{content}</div>
                      )}
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
