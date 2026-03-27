"use client";

import { useState, useEffect, useCallback } from "react";
import { CustomTab } from "@/types";

const STORAGE_KEY = "tma_custom_tabs";

// Helper to wrap Telegram CloudStorage with a Promise, falling back to localStorage
const tmaStorage = {
    getItem: (key: string): Promise<string | null> => {
        return new Promise((resolve) => {
            if (typeof window === "undefined") return resolve(null);
            
            const webApp = (window as any).Telegram?.WebApp;
            if (webApp?.CloudStorage) {
                webApp.CloudStorage.getItem(key, (err: any, value: string) => {
                    resolve(err ? null : value);
                });
            } else {
                resolve(localStorage.getItem(key));
            }
        });
    },
    setItem: (key: string, value: string): Promise<void> => {
        return new Promise((resolve) => {
            if (typeof window === "undefined") return resolve();

            const webApp = (window as any).Telegram?.WebApp;
            if (webApp?.CloudStorage) {
                webApp.CloudStorage.setItem(key, value, (err: any) => {
                    if (err) console.error("CloudStorage error", err);
                    resolve();
                });
            } else {
                localStorage.setItem(key, value);
                resolve();
            }
        });
    }
};

export function useTabs() {
    const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);

    const loadTabs = useCallback(async () => {
        const stored = await tmaStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as CustomTab[];
                setCustomTabs(parsed);
            } catch (e) {
                console.error("Failed to parse custom tabs from storage", e);
                setCustomTabs([]);
            }
        } else {
            setCustomTabs([]);
        }
    }, []);

    useEffect(() => {
        // Load initial state asynchronously
        loadTabs();

        const handleUpdate = () => loadTabs();
        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) loadTabs();
        }

        // Listen for our custom event (same window)
        window.addEventListener("tma_tabs_updated", handleUpdate);
        // Listen for storage events (other windows/tabs)
        window.addEventListener("storage", handleStorage);

        return () => {
            window.removeEventListener("tma_tabs_updated", handleUpdate);
            window.removeEventListener("storage", handleStorage);
        };
    }, [loadTabs]);

    const dispatchUpdate = () => {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("tma_tabs_updated"));
        }
    };

    const addCustomTab = async (name: string, url: string) => {
        const newTab: CustomTab = {
            id: crypto.randomUUID(),
            name,
            url,
        };
        const updated = [...customTabs, newTab];
        setCustomTabs(updated); // Optimistic visual update
        await tmaStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        dispatchUpdate();
    };

    const removeCustomTab = async (id: string) => {
        const updated = customTabs.filter(t => t.id !== id);
        setCustomTabs(updated); // Optimistic visual update
        await tmaStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        dispatchUpdate();
    };

    return {
        customTabs,
        addCustomTab,
        removeCustomTab,
    };
}
