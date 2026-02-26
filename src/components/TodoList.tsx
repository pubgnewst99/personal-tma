"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { TodoState } from "@/lib/todo-service";
import { apiClient } from "@/lib/api-client";

async function toggleTodoAction(id: number, checked: boolean, revision: string) {
    return apiClient.toggleTodo(id, checked, revision);
}

export default function TodoList({ initialState }: { initialState: TodoState }) {
    const [state, setState] = useState(initialState);
    const [isPending] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleToggle = async (id: number, checked: boolean) => {
        setError(null);

        // Trigger Telegram Haptic if available
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
        }

        try {
            const newState = await toggleTodoAction(id, checked, state.revision);
            setState(newState);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update task";
            setError(message);
            // Wait a bit then clear error
            setTimeout(() => setError(null), 5000);
        }
    };

    return (
        <div className="space-y-6">
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 text-red-500 text-xs flex items-center gap-2 border border-red-500/20"
                >
                    <AlertCircle size={14} />
                    {error}
                </motion.div>
            )}

            <div className="space-y-4">
                {state.parsed.map((node, index) => {
                    let nearestSection: string | null = null;
                    for (let i = index; i >= 0; i -= 1) {
                        const current = state.parsed[i];
                        if (current.type === "heading" && current.level === 2) {
                            nearestSection = current.text.toLowerCase();
                            break;
                        }
                    }
                    const isUnderFinished = Boolean(nearestSection && nearestSection.includes("finished"));

                    if (node.type === "heading") {
                        if (node.level === 2) {
                            return (
                                <div key={node.id} className="pt-8 pb-3 first:pt-0">
                                    <h2 className="text-[11px] uppercase tracking-[0.2em] font-black text-accent mb-2">
                                        {node.text}
                                    </h2>
                                    <div className="h-0.5 w-full bg-accent/10 rounded-full" />
                                </div>
                            );
                        }
                        return (
                            <div key={node.id} className="pt-4 pb-2">
                                <h3 className="text-base font-bold text-tg-text flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    {node.text}
                                </h3>
                            </div>
                        );
                    }

                    const nodeClasses = `flex items-start gap-4 p-3 rounded-2xl transition-all hover:bg-black/5 dark:hover:bg-white/5 group ${node.checked || isUnderFinished ? 'opacity-40' : ''}`;

                    return (
                        <motion.div
                            key={node.id}
                            layout
                            className={nodeClasses}
                        >
                            <button
                                onClick={() => handleToggle(node.id, !node.checked!)}
                                disabled={isPending}
                                className={`mt-0.5 flex-shrink-0 transition-transform active:scale-90 ${node.checked ? 'text-accent' : 'text-tg-hint'}`}
                            >
                                {node.checked ? (
                                    <div className="bg-accent rounded-full p-0.5 shadow-sm">
                                        <CheckCircle2 size={16} className="text-white" />
                                    </div>
                                ) : (
                                    <Circle size={20} className="group-hover:text-accent stroke-[1.5px]" />
                                )}
                            </button>
                            <div className={`flex-1 pt-0.5 ${node.checked || isUnderFinished ? 'line-through decoration-accent/30 text-tg-hint' : 'text-tg-text'}`}>
                                <div
                                    className="text-[15px] font-medium leading-relaxed"
                                    style={{ marginLeft: `${(node.indent?.length || 0) * 8}px` }}
                                >
                                    {node.text}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="pt-4 text-[10px] text-tg-hint text-center uppercase tracking-tighter">
                Revision: {state.revision} • Last synced recently
            </div>
        </div>
    );
}
