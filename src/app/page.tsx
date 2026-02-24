import { BookOpen, Lightbulb, CheckSquare } from "lucide-react";
import CategoryCard from "@/components/CategoryCard";

export default function Home() {
  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-tg-text mb-2 tracking-tight">Personal OS</h1>
        <p className="text-tg-hint leading-relaxed">Your minimalist archive and task system.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <CategoryCard
          title="Bacaan"
          description="Your curated reading list of articles and documents."
          path="/bacaan"
          icon={BookOpen}
        />
        <CategoryCard
          title="Idea"
          description="A nursery for your thoughts and creative projects."
          path="/idea"
          icon={Lightbulb}
        />
        <CategoryCard
          title="Tasks"
          description="Bidirectional sync with your local todo.md."
          path="/todos"
          icon={CheckSquare}
        />
      </div>

      <section className="mt-12">
        <h2 className="text-sm font-bold uppercase tracking-widest text-tg-text mb-6">Recent Activity</h2>
        <div className="p-8 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10 text-center">
          <p className="text-tg-hint text-sm italic">Fetching recent logs...</p>
        </div>
      </section>
    </div>
  );
}
