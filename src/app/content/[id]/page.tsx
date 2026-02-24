import { getContentById } from "@/lib/indexer";
import { ChevronLeft, Calendar, Tag } from "lucide-react";
import Link from "next/link";
import { remark } from "remark";
import html from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { notFound } from "next/navigation";

export default async function ContentPage({ params }: { params: { id: string } }) {
    const contentItem = await getContentById(params.id);

    if (!contentItem) {
        return notFound();
    }

    // Transform markdown to HTML
    const processedContent = await remark()
        .use(remarkParse)
        .use(remarkRehype)
        .use(html)
        .process(contentItem.content);
    const contentHtml = processedContent.toString();

    return (
        <div className="max-w-3xl mx-auto px-6 py-8 pb-32">
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
                        {new Date(contentItem.metadata.date || "").toLocaleDateString()}
                    </div>
                    {contentItem.metadata.tags.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Tag size={14} />
                            <div className="flex gap-1.5">
                                {contentItem.metadata.tags.map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <article
                className="prose dark:prose-invert prose-slate max-w-none 
          prose-headings:text-tg-text prose-p:text-tg-text/90 prose-a:text-accent 
          prose-strong:text-tg-text prose-code:text-accent prose-code:bg-accent/5 
          prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
        </div>
    );
}
