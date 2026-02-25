"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Lightbulb, House, CheckSquare } from "lucide-react";

export default function Navigation() {
    const pathname = usePathname();

    const tabs = [
        {
            name: "Home",
            path: "/",
            icon: House,
        },
        {
            name: "Bacaan",
            path: "/bacaan",
            icon: BookOpen,
        },
        {
            name: "Idea",
            path: "/idea",
            icon: Lightbulb,
        },
        {
            name: "Todos",
            path: "/todos",
            icon: CheckSquare,
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tg-secondary/80 backdrop-blur-md border-t border-black/5 dark:border-white/5 pb-safe">
            <div className="max-w-md mx-auto flex justify-around items-center px-4 py-3">
                {tabs.map((tab) => {
                    const isRootTab = tab.path === "/";
                    const isActive = isRootTab
                        ? pathname === "/"
                        : pathname === tab.path || pathname.startsWith(`${tab.path}/`);
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.path}
                            href={tab.path}
                            className={`flex flex-col items-center gap-1 transition-colors ${isActive ? "text-accent" : "text-tg-hint hover:text-tg-text"
                                }`}
                        >
                            <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-accent/10" : ""
                                }`}>
                                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider">
                                {tab.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
