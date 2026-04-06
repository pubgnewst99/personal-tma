"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { ContentItem } from "@/lib/indexer";

import { ChevronLeft, Calendar, Tag, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { remark } from "remark";
import rehypeHighlight from "rehype-highlight";
import html from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";

export default function ContentPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
  const [renderedContent, setRenderedContent] = useState<string>("");
  const [relatedItems, setRelatedItems] = useState<{id: string; title: string; source: string; similarity: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Invalid content ID");
      setLoading(false);
      return;
    }

    async function loadContent() {
      try {
        const item = await apiClient.getContentDetail(id);

        // Rewrite relative image paths (e.g., ./assets/image.jpg) to point to VPS API
        // This is a simple regex approach that covers standard markdown image syntax
        const rewrittenContent = item.content.replace(
          /!\[(.*?)\]\(\.\/(.*?)\)/g,
          (match, alt, relPath) => {
            const assetUrl = apiClient.getAssetUrl(relPath, item.metadata.source as "bacaan" | "idea");
            return `![${alt}](${assetUrl})`;
          }
        );

        setContentItem(item);

        apiClient.getRelatedContent(id)
          .then(setRelatedItems)
          .catch(e => console.error("Failed loading related:", e));

        const processedContent = await remark()
          .use(remarkParse)
          .use(remarkGfm)
          .use(remarkRehype)
          .use(rehypeHighlight, { detect: false, ignoreMissing: true })
          .use(html)
          .process(rewrittenContent);

        setRenderedContent(processedContent.toString());
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load content";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (error || !contentItem) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-tg-text mb-4">Content Not Found</h2>
        <p className="text-tg-hint mb-8">{error || "The requested document could not be retrieved."}</p>
        <Link href="/" className="text-accent hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
      <header className="mb-8">
        <Link
          href={contentItem.metadata.source === "bacaan" ? "/bacaan" : "/idea"}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 text-tg-hint text-sm hover:text-tg-text transition-colors mb-6"
        >
          <ChevronLeft size={16} />
          {contentItem.metadata.source === "bacaan" ? "Back to Bacaan" : "Back to Ideas"}
        </Link>

        <h1 className="text-3xl font-bold text-tg-text mb-4 leading-tight">
          {contentItem.metadata.title}
        </h1>

        <div className="flex flex-wrap gap-4 items-center text-xs text-tg-hint">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            {(() => {
              const d = new Date(contentItem.metadata.date || "");
              return isNaN(d.getTime()) ? (contentItem.metadata.date || "Unknown Date") : d.toLocaleDateString();
            })()}
          </div>
          {contentItem.metadata.tags.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Tag size={14} />
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {contentItem.metadata.tags.map(tag => (
                  <Link
                    key={tag}
                    href={`/${contentItem.metadata.source}?tag=${tag}`}
                    className="px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium hover:bg-accent hover:text-white transition-colors whitespace-nowrap"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <article
        className="markdown-body markdown-preview"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
      
      {relatedItems.length > 0 && (
        <div className="mt-16 pt-8 border-t border-black/10 dark:border-white/10">
          <h3 className="text-lg font-bold text-tg-text mb-6">Related Articles</h3>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {relatedItems.map(item => (
              <Link
                key={item.id}
                href={`/content/${item.id}`}
                className="block p-4 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                title={`${Math.round(item.similarity * 100)}% match`}
              >
                <div className="text-[10px] items-center gap-1.5 flex text-accent font-black uppercase tracking-wider mb-2">
                  <Tag size={12} />
                  {item.source}
                </div>
                <div className="text-sm font-semibold text-tg-text leading-snug line-clamp-2">{item.title}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
