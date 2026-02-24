"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ContentMetadata } from "@/lib/indexer";
import { FileText, ChevronRight } from "lucide-react";

interface FileCardProps {
    item: ContentMetadata;
}

export default function FileCard({ item }: FileCardProps) {
    const router = useRouter();

    const handleCardClick = () => {
        router.push(`/content/${item.id}`);
    };

    const handleTagClick = (e: React.MouseEvent, tag: string) => {
        e.stopPropagation();
        router.push(`/${item.source}?tag=${tag}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleCardClick}
            className="group relative p-6 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm border border-black/5 dark:border-white/5 hover:shadow-md transition-all cursor-pointer mb-4"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 text-accent">
                    <FileText size={18} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">
                        {item.readingTime || 1} MIN READ
                    </span>
                </div>
                <span className="text-xs text-tg-hint">
                    {new Date(item.date || "").toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}
                </span>
            </div>

            <h4 className="text-lg font-bold text-tg-text group-hover:text-accent transition-colors mb-2 leading-tight">
                {item.title}
            </h4>

            {item.summary && (
                <p className="text-sm text-tg-hint line-clamp-2 mb-4 leading-relaxed">
                    {item.summary}
                </p>
            )}

            <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-wrap gap-1.5">
                    {item.tags.slice(0, 3).map(tag => (
                        <button
                            key={tag}
                            onClick={(e) => handleTagClick(e, tag)}
                            className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[10px] font-bold text-tg-hint hover:text-accent transition-colors"
                        >
                            #{tag.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1 text-accent font-bold text-xs">
                    <span>Read more</span>
                    <ChevronRight size={14} />
                </div>
            </div>
        </motion.div>
    );
}
