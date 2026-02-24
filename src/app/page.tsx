"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { TodoState } from "@/lib/todo-service";
import TodoList from "@/components/TodoList";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [initialState, setInitialState] = useState<TodoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getTodos()
      .then(setInitialState)
      .catch(err => {
        console.error("Fetch error:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-tg-text mb-2 tracking-tight">Personal OS</h1>
        <p className="text-tg-hint leading-relaxed italic text-sm">Welcome back. Here are your tasks.</p>
      </header>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : error ? (
        <div className="py-20 text-center">
          <p className="text-red-500 text-sm mb-4">Failed to load content: {error}</p>
          <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-tg-hint text-left font-mono break-all">
            API_URL: {process.env.NEXT_PUBLIC_API_BASE_URL || "(not set)"}
          </div>
        </div>
      ) : initialState ? (
        <TodoList initialState={initialState} />
      ) : null}
    </div>
  );
}
