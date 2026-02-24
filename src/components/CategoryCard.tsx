"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Lightbulb, CheckSquare, HelpCircle } from "lucide-react";

const ICON_MAP = {
    bacaan: BookOpen,
    idea: Lightbulb,
    todos: CheckSquare,
};

interface CategoryCardProps {
    title: string;
    description: string;
    icon: React.ElementType; // Changed from iconType
    path: string; // Changed from href
    count?: number;
}

export default function CategoryCard({ title, description, path, icon: Icon }: CategoryCardProps) {
    // const Icon = ICON_MAP[iconType] || HelpCircle; // This line is removed as icon is passed directly

    return (
        <Link href={path}>
            <motion.div
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="h-full p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4"
            >
                <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-tg-text">
                    <Icon size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-tg-text mb-1">{title}</h3>
                    <p className="text-[11px] text-tg-hint leading-relaxed">{description}</p>
                </div>
            </motion.div>
        </Link>
    );
}
