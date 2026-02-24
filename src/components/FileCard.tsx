"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ContentMetadata } from "@/lib/indexer";

interface FileCardProps {
    item: ContentMetadata;
}

export default function FileCard({ item }: FileCardProps) {
    return (
        <Link href={`/content/${item.id}`}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative p-4 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5 last:border-0"
            >
                <div className="flex justify-between items-start mb-1">
                    <h4 className="font-semibold text-tg-text group-hover:text-accent transition-colors">
                        {item.title}
                    </h4>
                    <span className="text-[10px] uppercase tracking-wider text-tg-hint font-mono">
                        {item.source}
                    </span>
                </div>

                {item.summary && (
                    <p className="text-sm text-tg-hint line-clamp-2 mb-2 leading-relaxed">
                        {item.summary}
                    </p>
                )}

                <div className="flex flex-wrap gap-2 items-center text-[11px]">
                    <span className="text-tg-hint">
                        {new Date(item.date || "").toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </span>
                    {item.tags.length > 0 && (
                        <>
                            <span className="text-black/20 dark:text-white/20">•</span>
                            <div className="flex gap-1">
                                {item.tags.slice(0, 3).map(tag => (
                                    <span key={tag} className="px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </Link>
    );
}
