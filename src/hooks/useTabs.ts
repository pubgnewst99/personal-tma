"use client";

import { useState, useEffect } from "react";
import { CustomTab } from "@/types";

const STORAGE_KEY = "tma_custom_tabs";

export function useTabs() {
    const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as CustomTab[];
                setCustomTabs(parsed);
            } catch (e) {
                console.error("Failed to parse custom tabs from localStorage", e);
            }
        }
    }, []);

    const addCustomTab = (name: string, url: string) => {
        const newTab: CustomTab = {
            id: crypto.randomUUID(),
            name,
            url,
        };
        const updated = [...customTabs, newTab];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setCustomTabs(updated);
    };

    const removeCustomTab = (id: string) => {
        const updated = customTabs.filter(t => t.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setCustomTabs(updated);
    };

    return {
        customTabs,
        addCustomTab,
        removeCustomTab,
    };
}
