"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Circle, Loader2, AlertCircle } from "lucide-react";
import { TodoItem, TodoState } from "@/lib/todo-service";
import { useRouter } from "next/navigation";

// Placeholder for Server Actions we'll implement next
async function toggleTodoAction(id: number, checked: boolean, revision: string) {
    const res = await fetch("/api/todos/toggle", {
        method: "PATCH",
        body: JSON.stringify({ id, checked, revision }),
        headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export default function TodoList({ initialState }: { initialState: TodoState }) {
    const [state, setState] = useState(initialState);
    const [isPending, startTransition] = useTransition();
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
        } catch (err: any) {
            setError(err.message);
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

            <div className="space-y-1">
                {state.parsed.map((todo) => (
                    <motion.div
                        key={todo.id}
                        layout
                        className={`flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/5 group`}
                    >
                        <button
                            onClick={() => handleToggle(todo.id, !todo.checked)}
                            disabled={isPending}
                            className={`mt-0.5 transition-colors ${todo.checked ? 'text-accent' : 'text-tg-hint'}`}
                        >
                            {todo.checked ? <CheckCircle2 size={20} /> : <Circle size={20} className="group-hover:text-accent" />}
                        </button>
                        <div className={`flex-1 transition-opacity ${todo.checked ? 'opacity-50 line-through' : ''}`}>
                            <div
                                className="text-tg-text text-[15px]"
                                style={{ marginLeft: `${todo.indent.length * 10}px` }}
                            >
                                {todo.text}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="pt-4 text-[10px] text-tg-hint text-center uppercase tracking-tighter">
                Revision: {state.revision} • Last synced recently
            </div>
        </div>
    );
}
