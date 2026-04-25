import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductRow } from "./ProductRow";
import { CategoryPills } from "./CategoryPills";
import type { CatalogProduct } from "@/types";

const PLACEHOLDERS = [
  "a summer wedding in Tuscany…",
  "my first day at a new job…",
  "a beach holiday in Bali…",
  "an autumn dinner party…",
];

interface Props {
  catalog: CatalogProduct[];
  articleTypes: string[];
  onSearch: (q: string) => void;
}

function shuffle<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function HomeScreen({ catalog, articleTypes, onSearch }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [phIdx, setPhIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => (filter ? catalog.filter((p) => p.articleType === filter) : catalog), [catalog, filter]);
  const newIn = useMemo(() => shuffle(filtered, 30), [filtered]);
  const trending = useMemo(() => shuffle(filtered, 30), [filtered]);

  const submit = () => {
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <div className="max-w-[1400px] mx-auto px-12">
      <header className="py-8 text-center">
        <h1 className="font-display text-3xl tracking-[0.2em]">RETAILNEXT</h1>
      </header>

      <section className="py-20 text-center">
        <h2 className="font-display text-5xl mb-10">What are you dressing for?</h2>
        <div className="max-w-2xl mx-auto flex gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDERS[phIdx]}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="flex-1 h-14 text-base bg-transparent border-ink/20 rounded-none"
          />
          <Button onClick={submit} className="h-14 px-8 rounded-none bg-ink hover:bg-accent">
            Style me
          </Button>
        </div>
      </section>

      <CategoryPills articleTypes={articleTypes} selected={filter} onSelect={setFilter} />

      <div className="py-12">
        <ProductRow title="New In" products={newIn} />
        <ProductRow title="Trending" products={trending} />
      </div>
    </div>
  );
}
