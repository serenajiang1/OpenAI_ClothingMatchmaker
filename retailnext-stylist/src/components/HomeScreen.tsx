import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";
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
  onOpenCart: () => void;
}

function shuffle<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function sortNewest(products: CatalogProduct[]): CatalogProduct[] {
  const toKey = (p: CatalogProduct) => {
    const fromYear = Number(p.year ?? "");
    if (Number.isFinite(fromYear) && fromYear > 0) return fromYear;
    return Number(p.id);
  };
  return [...products].sort((a, b) => toKey(b) - toKey(a));
}

export function HomeScreen({ catalog, articleTypes, onSearch, onOpenCart }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [phIdx, setPhIdx] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () =>
      (filter ? catalog.filter((p) => p.articleType === filter) : catalog).filter(
        (p) => p.masterCategory !== "Free Items"
      ),
    [catalog, filter]
  );
  const newIn = useMemo(() => sortNewest(filtered).slice(0, 30), [filtered]);
  const trending = useMemo(() => shuffle(filtered, 30), [filtered]);

  const submit = () => {
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <div className="max-w-[1400px] mx-auto px-12">
      <header className="py-8 text-center">
        <h1 className="font-display text-3xl font-light tracking-[0.2em]">RETAILNEXT</h1>
      </header>

      <section className="py-20 text-center">
        <h2 className="font-display text-5xl font-light mb-10">You going somewhere?</h2>
        <div className="mx-auto max-w-2xl rounded-softer border border-ink/10 bg-panel p-3 shadow-sm">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDERS[phIdx]}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              className="max-h-[140px] min-h-[44px] flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[15px] leading-6 text-ink placeholder:text-ink/45 focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-ink text-cream transition hover:bg-accent"
              aria-label="Send"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <CategoryPills articleTypes={articleTypes} selected={filter} onSelect={setFilter} />

      <div className="py-12">
        <ProductRow title="New In" products={newIn} catalog={catalog} onOpenCart={onOpenCart} />
        <ProductRow title="Trending" products={trending} catalog={catalog} onOpenCart={onOpenCart} />
      </div>
    </div>
  );
}
