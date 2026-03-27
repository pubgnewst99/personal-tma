"use client";

import { useState, useEffect, useCallback } from "react";
import { CustomTab } from "@/types";

const STORAGE_KEY = "tma_custom_tabs";

export function useTabs() {
    const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);

    const loadTabs = useCallback(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as CustomTab[];
                setCustomTabs(parsed);
            } catch (e) {
                console.error("Failed to parse custom tabs from localStorage", e);
            }
        } else {
            setCustomTabs([]);
        }
    }, []);

    useEffect(() => {
        // Load initial state
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

    const addCustomTab = (name: string, url: string) => {
        const newTab: CustomTab = {
            id: crypto.randomUUID(),
            name,
            url,
        };
        const updated = [...customTabs, newTab];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        // State will update via the event listener immediately
        dispatchUpdate();
    };

    const removeCustomTab = (id: string) => {
        const updated = customTabs.filter(t => t.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        // State will update via the event listener immediately
        dispatchUpdate();
    };

    return {
        customTabs,
        addCustomTab,
        removeCustomTab,
    };
}
