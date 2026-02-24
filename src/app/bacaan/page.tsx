"use client";

import { useEffect, useState, Suspense } from "react";
import { apiClient } from "@/lib/api-client";
import { ContentMetadata } from "@/lib/indexer";
import FileCard from "@/components/FileCard";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function BacaanContent() {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag");

  const [items, setItems] = useState<ContentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [activeTag, setActiveTag] = useState<string | null>(initialTag);

  useEffect(() => {
    apiClient.getContentList("bacaan")
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const allTags = Array.from(new Set(items.flatMap(item => item.tags))).sort();

  const filteredAndSortedItems = items
    .filter(item => !activeTag || item.tags.includes(activeTag))
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
              onClick={() => setActiveTag(null)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!activeTag ? "bg-accent border-accent text-white" : "border-black/10 dark:border-white/10 text-tg-hint hover:text-tg-text"}`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeTag === tag ? "bg-accent border-accent text-white" : "border-black/10 dark:border-white/10 text-tg-hint hover:text-tg-text"}`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
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
