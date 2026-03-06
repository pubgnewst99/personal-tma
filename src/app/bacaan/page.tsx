"use client";

import { useEffect, useState, Suspense } from "react";
import { apiClient } from "@/lib/api-client";
import { ContentMetadata } from "@/lib/indexer";
import FileCard from "@/components/FileCard";
import { ChevronLeft, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

function BacaanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [items, setItems] = useState<ContentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "title">("date");

  // Sync state with URL params
  const activeTag = searchParams.get("tag");
  const searchQuery = searchParams.get("q") || "";

  useEffect(() => {
    apiClient.getContentList("bacaan")
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const allTags = Array.from(new Set(items.flatMap(item => item.tags || []))).sort();

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredAndSortedItems = items
    .filter(item => !activeTag || item.tags?.includes(activeTag))
    .filter((item) => {
      if (!normalizedQuery) return true;

      const haystack = [
        item.title,
        item.summary || "",
        (item.tags || []).join(" "),
        item.path,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      }
      return a.title.localeCompare(b.title);
    });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-tg-hint"
            >
              <ChevronLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-tg-text">Bacaan</h1>
          </div>
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg">
            <button
              onClick={() => setSortBy("date")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${sortBy === "date" ? "bg-white dark:bg-zinc-800 shadow-sm text-tg-text" : "text-tg-hint"}`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy("title")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${sortBy === "title" ? "bg-white dark:bg-zinc-800 shadow-sm text-tg-text" : "text-tg-hint"}`}
            >
              A-Z
            </button>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
            <button
              onClick={() => updateParams({ tag: null })}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!activeTag ? "bg-accent border-accent text-white" : "border-black/10 dark:border-white/10 text-tg-hint hover:text-tg-text"}`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => updateParams({ tag: tag === activeTag ? null : tag })}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeTag === tag ? "bg-accent border-accent text-white" : "border-black/10 dark:border-white/10 text-tg-hint hover:text-tg-text"}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="relative mt-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-hint" />
          <input
            value={searchQuery}
            onChange={(e) => updateParams({ q: e.target.value })}
            placeholder="Search title, summary, tags..."
            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 pl-9 pr-9 py-2 text-sm text-tg-text placeholder:text-tg-hint outline-none focus:ring-2 focus:ring-accent/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => updateParams({ q: null })}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-tg-hint"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : error ? (
        <div className="py-20 text-center text-red-500 text-sm">
          Failed to load: {error}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSortedItems.length > 0 ? (
            filteredAndSortedItems.map(item => (
              <FileCard key={item.id} item={item} />
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="text-4xl text-tg-hint opacity-50">📚</div>
              <p className="text-tg-hint">No items found matching your filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
export default function BacaanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    }>
      <BacaanContent />
    </Suspense>
  );
}
