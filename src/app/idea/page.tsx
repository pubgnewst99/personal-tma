"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { ContentMetadata } from "@/lib/indexer";
import FileCard from "@/components/FileCard";
import { ChevronLeft, Folder, Loader2 } from "lucide-react";
import Link from "next/link";

export default function IdeaPage() {
  const [items, setItems] = useState<ContentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getContentList("idea")
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Group by folder
  const groups = items.reduce((acc, item) => {
    const folder = item.folder || "Uncategorized";
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(item);
    return acc;
  }, {} as Record<string, ContentMetadata[]>);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-tg-hint"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-tg-text">Ideas</h1>
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
          {Object.keys(groups).length > 0 ? (
            Object.entries(groups).map(([folder, folderItems]) => (
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
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="text-4xl">💡</div>
              <p className="text-tg-hint">No ideas found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
