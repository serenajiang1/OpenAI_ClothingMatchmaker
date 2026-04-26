import type { CatalogProduct, ScoredCatalogProduct } from "@/types";
import { ProductCard } from "./ProductCard";

export function ProductRow({
  title,
  products,
  catalog,
  onOpenCart,
  complimentary = false,
}: {
  title: string;
  products: Array<CatalogProduct | ScoredCatalogProduct>;
  catalog: CatalogProduct[];
  onOpenCart: () => void;
  complimentary?: boolean;
}) {
  return (
    <section className="mb-14">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-3xl font-light">{title}</h2>
        <span className="text-[10px] uppercase tracking-widest text-ink/45">{products.length} items</span>
      </div>
      <div className="border-t border-ink/10 mb-6" />
      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            catalog={catalog}
            onOpenCart={onOpenCart}
            complimentary={complimentary}
          />
        ))}
      </div>
    </section>
  );
}
