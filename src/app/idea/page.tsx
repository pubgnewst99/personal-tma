import { useEffect, useState, Suspense } from "react";
import { apiClient } from "@/lib/api-client";
import { ContentMetadata } from "@/lib/indexer";
import FileCard from "@/components/FileCard";
import { ChevronLeft, Folder, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function IdeaContent() {
  const searchParams = useSearchParams();
  const initialTag = searchParams.get("tag");

  const [items, setItems] = useState<ContentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "title">("title");
  const [activeTag, setActiveTag] = useState<string | null>(initialTag);

  useEffect(() => {
    apiClient.getContentList("idea")
      .then(setItems)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Group by folder and sort
  const groups = items
    .filter(item => !activeTag || item.tags.includes(activeTag))
    .reduce((acc, item) => {
      const folder = item.folder || "Uncategorized";
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(item);
      return acc;
    }, {} as Record<string, ContentMetadata[]>);

  // Sort folders alphabetically
  const sortedFolderNames = Object.keys(groups).sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;
    return a.localeCompare(b);
  });

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
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-tg-text">Ideas</h1>
            {activeTag && (
              <span className="text-xs text-accent font-medium">Filtered by #{activeTag}</span>
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
                  return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
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
              <p className="text-tg-hint">No ideas found matching #{activeTag}</p>
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
