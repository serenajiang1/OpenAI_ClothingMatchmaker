import type { CatalogProduct } from "@/types";

export function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <div className="w-[220px] flex-shrink-0 group cursor-pointer">
      <div className="aspect-square overflow-hidden bg-sand mb-3">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
          }}
        />
      </div>
      <p className="text-sm leading-snug line-clamp-2">{product.name}</p>
      <p className="text-xs uppercase tracking-wide text-ink/50 mt-1">{product.articleType}</p>
    </div>
  );
}
