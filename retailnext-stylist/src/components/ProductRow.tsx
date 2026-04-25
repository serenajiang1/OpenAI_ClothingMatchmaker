import type { CatalogProduct } from "@/types";
import { ProductCard } from "./ProductCard";

export function ProductRow({ title, products }: { title: string; products: CatalogProduct[] }) {
  return (
    <section className="mb-16">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-3xl">{title}</h2>
        <span className="text-xs uppercase tracking-widest text-ink/50">{products.length} items</span>
      </div>
      <div className="border-t border-ink/10 mb-6" />
      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
