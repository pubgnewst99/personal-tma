"use client";

import { useState } from "react";
import { useTabs } from "@/hooks/useTabs";
import { isValidExternalUrl } from "@/lib/open-external-link";
import { ChevronLeft, Trash2, Globe, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
    const { customTabs, addCustomTab, removeCustomTab } = useTabs();
    const [name, setName] = useState("");
    const [url, setUrl] = useState("https://");
    const [error, setError] = useState<string | null>(null);

    const handleAddTab = () => {
        setError(null);
        if (!name.trim()) {
            setError("Tab name is required.");
            return;
        }
        if (!isValidExternalUrl(url)) {
            setError("Please enter a valid https:// URL.");
            return;
        }
        if (customTabs.length >= 5) {
            setError("Maximum of 5 custom tabs allowed.");
            return;
        }

        addCustomTab(name.trim(), url.trim());
        setName("");
        setUrl("https://");
    };

    return (
        <div className="max-w-md mx-auto px-6 py-8 pb-32">
            <header className="mb-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 dark:bg-white/5 text-tg-hint text-sm hover:text-tg-text transition-colors mb-6"
                >
                    <ChevronLeft size={16} />
                    Back to Home
                </Link>
                <h1 className="text-3xl font-bold text-tg-text mb-2">Settings</h1>
                <p className="text-tg-hint text-sm">Manage your launcher tabs.</p>
            </header>

            <section className="mb-10">
                <h2 className="text-sm font-bold uppercase tracking-widest text-accent mb-4">Add Custom Tab</h2>
                <div className="bg-tg-secondary/50 rounded-2xl p-4 border border-black/5 dark:border-white/5 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-xs flex items-center gap-2 border border-red-500/20">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-tg-hint px-1">Tab Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Dashboard"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-2.5 text-sm text-tg-text outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                        />
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-tg-hint px-1">Web App URL</label>
                        <input
                            type="url"
                            placeholder="https://"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-2.5 text-sm text-tg-text outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                        />
                    </div>

                    <button
                        onClick={handleAddTab}
                        disabled={customTabs.length >= 5}
                        className="w-full mt-2 flex items-center justify-center gap-2 bg-accent text-white rounded-xl py-3 text-sm font-bold shadow-sm hover:bg-opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={18} />
                        Add Tab
                    </button>
                    {customTabs.length >= 5 && (
                        <p className="text-center text-[10px] text-tg-hint uppercase mt-2">Tab limit reached (5/5)</p>
                    )}
                </div>
            </section>

            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-accent">Active Tabs</h2>
                    <span className="text-xs font-semibold text-tg-hint bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                        {customTabs.length} / 5
                    </span>
                </div>
                
                {customTabs.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl">
                        <Globe className="mx-auto text-tg-hint opacity-50 mb-3" size={32} />
                        <p className="text-sm text-tg-hint">No custom tabs added yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {customTabs.map((tab) => (
                            <div
                                key={tab.id}
                                className="flex items-center justify-between bg-tg-secondary/50 rounded-xl p-3 border border-black/5 dark:border-white/5"
                            >
                                <div className="flex items-center gap-3 overflow-hidden border-r border-transparent pr-2">
                                    <div className="bg-accent/10 p-2 rounded-lg text-accent flex-shrink-0">
                                        <Globe size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-tg-text truncate">{tab.name}</p>
                                        <p className="text-xs text-tg-hint truncate">{tab.url}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeCustomTab(tab.id)}
                                    className="p-2 text-tg-hint hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                                    title="Remove tab"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
