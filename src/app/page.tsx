import { BookOpen, Lightbulb, CheckSquare } from "lucide-react";
import CategoryCard from "@/components/CategoryCard";

export default function Home() {
  return (
    <div className="px-6 py-8 md:px-12 md:py-16 max-w-4xl mx-auto space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-tg-text">
          Personal OS
        </h1>
        <p className="text-tg-hint">
          Your minimalist archive and task system.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <CategoryCard
          title="Bacaan"
          description="Your curated reading list of articles and documents."
          iconType="bacaan"
          href="/bacaan"
        />
        <CategoryCard
          title="Idea"
          description="A nursery for your thoughts and creative projects."
          iconType="idea"
          href="/idea"
        />
        <CategoryCard
          title="Tasks"
          description="Bidirectional sync with your local todo.md."
          iconType="todos"
          href="/todos"
        />
      </div>

      <section className="pt-8 border-t border-black/5 dark:border-white/5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-tg-text">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Recent Activity
        </h2>
        <div className="text-sm text-tg-hint italic">
          Fetching recent logs...
        </div>
      </section>
    </div>
  );
}
