import { listContent } from "@/lib/indexer";
import FileCard from "@/components/FileCard";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function BacaanPage() {
    const items = await listContent("bacaan");

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
                <span className="text-xs font-medium text-tg-hint px-2 py-1 bg-black/5 dark:bg-white/5 rounded-full">
                    {items.length} Files
                </span>
            </header>

            <div className="space-y-2">
                {items.length > 0 ? (
                    items.map(item => (
                        <FileCard key={item.id} item={item} />
                    ))
                ) : (
                    <div className="py-20 text-center space-y-4">
                        <div className="text-4xl">📚</div>
                        <p className="text-tg-hint">No reading material found in ~/Bacaan</p>
                    </div>
                )}
            </div>

            {/* Infinite Scroll trigger would go here for Client Component version */}
        </div>
    );
}
