"use client";

import { useSearchParams } from "next/navigation";
import { Loader2, Globe } from "lucide-react";
import { Suspense, useState } from "react";

function ViewerContent() {
    const searchParams = useSearchParams();
    const url = searchParams.get("url");
    const name = searchParams.get("name") || "Custom App";
    const [loading, setLoading] = useState(true);

    if (!url) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
                <Globe size={48} className="text-tg-hint opacity-30 mb-4" />
                <h2 className="text-xl font-bold text-tg-text mb-2">Invalid Tab</h2>
                <p className="text-sm text-tg-hint">No valid URL was provided for this tab.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-80px)] relative">
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-tg-bg z-10">
                    <Loader2 className="animate-spin text-accent mb-4" size={32} />
                    <p className="text-sm font-semibold text-tg-hint uppercase tracking-wider">{name}</p>
                </div>
            )}
            <iframe
                src={url}
                className="w-full h-full border-none bg-tg-bg"
                onLoad={() => setLoading(false)}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title={name}
            />
        </div>
    );
}

export default function AppViewerPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin text-accent" size={32}/></div>}>
            <ViewerContent />
        </Suspense>
    );
}
