"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { ContentMetadata } from "@/lib/indexer";
import FileCard from "@/components/FileCard";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function BacaanPage() {
  const [items, setItems] = useState<ContentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getContentList("bacaan")
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
          <h1 className="text-2xl font-bold text-tg-text">Bacaan</h1>
        </div>
        {!loading && (
          <span className="text-xs font-medium text-tg-hint px-2 py-1 bg-black/5 dark:bg-white/5 rounded-full">
            {items.length} Files
          </span>
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
          {items.length > 0 ? (
            items.map(item => (
              <FileCard key={item.id} item={item} />
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="text-4xl">📚</div>
              <p className="text-tg-hint">No reading material found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
