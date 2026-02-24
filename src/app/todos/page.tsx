"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { TodoState } from "@/lib/todo-service";
import TodoList from "@/components/TodoList";
import { ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function TodoPage() {
  const [initialState, setInitialState] = useState<TodoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.getTodos()
      .then(setInitialState)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-tg-hint"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-tg-text">Tasks</h1>
        </div>
      </header>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : error ? (
        <div className="py-20 text-center text-red-500 text-sm">
          Failed to load: {error}
        </div>
      ) : initialState ? (
        <TodoList initialState={initialState} />
      ) : null}
    </div>
  );
}
