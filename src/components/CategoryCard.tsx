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
    iconType: keyof typeof ICON_MAP;
    href: string;
    count?: number;
}

export default function CategoryCard({ title, description, iconType, href, count }: CategoryCardProps) {
    const Icon = ICON_MAP[iconType] || HelpCircle;

    return (
        <Link href={href}>
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group overflow-hidden rounded-2xl p-6 bg-tg-secondary border border-black/5 dark:border-white/5 shadow-sm"
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-accent/10 text-accent">
                        <Icon size={24} />
                    </div>
                    {count !== undefined && (
                        <span className="text-xs font-medium text-tg-hint px-2 py-1 bg-black/5 dark:bg-white/5 rounded-full">
                            {count} items
                        </span>
                    )}
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-tg-text mb-1">{title}</h3>
                    <p className="text-sm text-tg-hint line-clamp-2">{description}</p>
                </div>
                <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.div
                        initial={{ x: -10 }}
                        animate={{ x: 0 }}
                        className="text-accent"
                    >
                        →
                    </motion.div>
                </div>
            </motion.div>
        </Link>
    );
}
