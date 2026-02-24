import { getTodoState } from "@/lib/todo-service";
import TodoList from "@/components/TodoList";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function TodoPage() {
    const initialState = await getTodoState();

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

            <TodoList initialState={initialState} />
        </div>
    );
}
