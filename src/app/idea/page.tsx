"use client";

import { useEffect, useState, Suspense } from "react";
import { apiClient } from "@/lib/api-client";
import { ContentMetadata } from "@/lib/indexer";
import FileCard from "@/components/FileCard";
import { ChevronLeft, Folder, Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function IdeaContent() {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag");

  const [items, setItems] = useState<ContentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "title">("date");
  const [activeTag, setActiveTag] = useState<string | null>(initialTag);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setActiveTag(initialTag);
  }, [initialTag]);

  useEffect(() => {
    apiClient.getContentList("idea")
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Group by folder and sort
  const groups = items
    .filter(item => !activeTag || item.tags?.includes(activeTag))
    .filter((item) => {
      if (!normalizedQuery) return true;

      const haystack = [
        item.title,
        item.summary || "",
        (item.tags || []).join(" "),
        item.folder || "",
        item.path,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    })
    .reduce((acc, item) => {
      const folder = item.folder || "Uncategorized";
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(item);
      return acc;
    }, {} as Record<string, ContentMetadata[]>);

  const getItemDate = (item: ContentMetadata) => new Date(item.date || 0).getTime();

  const sortedFolderNames = Object.keys(groups).sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;

    if (sortBy === "date") {
      const aLatest = Math.max(...groups[a].map(getItemDate));
      const bLatest = Math.max(...groups[b].map(getItemDate));
      return bLatest - aLatest;
    }

    return a.localeCompare(b);
  });

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-tg-hint"
            >
              <ChevronLeft size={20} />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-tg-text">Ideas</h1>
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="text-xs text-accent font-medium hover:underline text-left"
                >
                  Filtered by #{activeTag} (clear)
                </button>
              )}
            </div>
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

        <div className="relative mt-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-tg-hint" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, summary, tags, folder..."
            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 pl-9 pr-9 py-2 text-sm text-tg-text placeholder:text-tg-hint outline-none focus:ring-2 focus:ring-accent/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
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
        <div className="space-y-12">
          {sortedFolderNames.length > 0 ? (
            sortedFolderNames.map((folder) => {
              const folderItems = [...groups[folder]].sort((a, b) => {
                if (sortBy === "date") {
                  return getItemDate(b) - getItemDate(a);
                }
                return a.title.localeCompare(b.title);
              });

              return (
                <section key={folder}>
                  <h2 className="text-xs uppercase tracking-widest font-bold text-accent mb-4 flex items-center gap-2">
                    <Folder size={14} />
                    {folder}
                  </h2>
                  <div className="space-y-1">
                    {folderItems.map(item => (
                      <FileCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="text-4xl text-tg-hint opacity-50">💡</div>
              <p className="text-tg-hint">
                {activeTag
                  ? `No ideas found matching #${activeTag}`
                  : "No ideas found"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function IdeaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    }>
      <IdeaContent />
    </Suspense>
  );
}
