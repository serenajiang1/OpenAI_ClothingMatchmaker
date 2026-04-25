import { Button } from "@/components/ui/button";
import { ProductRow } from "./ProductRow";
import type { CatalogProduct, Intent } from "@/types";

interface Props {
  intent: Intent;
  dalleImageUrl: string;
  grouped: Record<string, Array<CatalogProduct & { score: number }>>;
  onReset: () => void;
}

export function ResultsScreen({ intent, dalleImageUrl, grouped, onReset }: Props) {
  const groupEntries = Object.entries(grouped).sort(([, a], [, b]) => b.length - a.length);

  return (
    <div className="max-w-[1400px] mx-auto px-12">
      <header className="py-8 flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-[0.2em]">RETAILNEXT</h1>
        <button onClick={onReset} className="text-xs uppercase tracking-widest text-ink/60 hover:text-ink">
          ← Start over
        </button>
      </header>

      <section className="py-12 flex items-start justify-between gap-12">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-ink/50 mb-3">
            {intent.season} · {intent.gender}
          </div>
          <h2 className="font-display text-5xl leading-tight">Your looks for a {intent.occasion}</h2>
        </div>
        <div className="flex-shrink-0 text-center">
          <img src={dalleImageUrl} alt="Style inspiration" className="w-[180px] h-[180px] object-cover rounded-sm shadow-md" />
          <div className="text-[10px] uppercase tracking-widest text-ink/50 mt-2">style inspiration</div>
        </div>
      </section>

      <div className="py-12">
        {groupEntries.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-display text-2xl mb-6">
              We couldn't find quite the right matches - try a different occasion?
            </p>
            <Button onClick={onReset} className="rounded-none bg-ink hover:bg-accent">
              Start over
            </Button>
          </div>
        ) : (
          groupEntries.map(([groupName, products]) => <ProductRow key={groupName} title={groupName} products={products} />)
        )}
      </div>
    </div>
  );
}
