"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Lightbulb, House, CheckSquare, Globe, Settings } from "lucide-react";
import { useTabs } from "@/hooks/useTabs";
import { openExternalLink } from "@/lib/open-external-link";

export default function Navigation() {
    const pathname = usePathname();
    const { customTabs } = useTabs();

    const builtInTabs = [
        { name: "Home", path: "/", icon: House },
        { name: "Bacaan", path: "/bacaan", icon: BookOpen },
        { name: "Idea", path: "/idea", icon: Lightbulb },
        { name: "Todos", path: "/todos", icon: CheckSquare },
    ];

    const visibleCustomTabs = customTabs.slice(0, 5);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-tg-secondary/80 backdrop-blur-md border-t border-black/5 dark:border-white/5 pb-safe">
            <div className="max-w-md mx-auto flex items-center px-1 py-3">
                
                {/* Scrollable Tabs Area */}
                <div className="flex-1 flex justify-start items-center overflow-x-auto no-scrollbar gap-2 pr-2">
                    {builtInTabs.map((tab) => {
                        const isRootTab = tab.path === "/";
                        const isActive = isRootTab
                            ? pathname === "/"
                            : pathname === tab.path || pathname.startsWith(`${tab.path}/`);
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.path}
                                href={tab.path}
                                className={`flex flex-col items-center gap-1 transition-colors min-w-[60px] flex-shrink-0 ${isActive ? "text-accent" : "text-tg-hint hover:text-tg-text"
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

                    {visibleCustomTabs.map((tab) => {
                        return (
                            <button
                                key={tab.id}
                                onClick={() => openExternalLink(tab.url)}
                                className="flex flex-col items-center gap-1 transition-colors min-w-[60px] flex-shrink-0 text-tg-hint hover:text-tg-text"
                            >
                                <div className="p-1.5 rounded-xl transition-all">
                                    <Globe size={24} strokeWidth={2} />
                                </div>
                                <span className="text-[10px] font-semibold uppercase tracking-wider truncate max-w-[56px]" title={tab.name}>
                                    {tab.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Fixed Settings Gear */}
                <div className="flex-shrink-0 border-l border-black/10 dark:border-white/10 pl-2 pr-1">
                    <Link
                        href="/settings"
                        className={`flex flex-col items-center gap-1 transition-colors min-w-[60px] ${pathname === "/settings" ? "text-accent" : "text-tg-hint hover:text-tg-text"
                            }`}
                    >
                        <div className={`p-1.5 rounded-xl transition-all ${pathname === "/settings" ? "bg-accent/10" : ""
                            }`}>
                            <Settings size={24} strokeWidth={pathname === "/settings" ? 2.5 : 2} />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider">
                            Settings
                        </span>
                    </Link>
                </div>

            </div>
        </nav>
    );
}
