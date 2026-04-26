import { useState } from "react";
import { Heart } from "lucide-react";
import type { CatalogProduct, ScoredCatalogProduct } from "@/types";
import { ProductQuickViewModal } from "./ProductQuickViewModal";
import { mockAvailability } from "@/lib/mockRetail";
import { useWishlist } from "@/context/WishlistContext";
import { useToast } from "@/context/ToastContext";

export function ProductCard({
  product,
  catalog,
  onOpenCart,
  complimentary = false,
}: {
  product: CatalogProduct | ScoredCatalogProduct;
  catalog: CatalogProduct[];
  onOpenCart: () => void;
  complimentary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [activeProduct, setActiveProduct] = useState<CatalogProduct | null>(null);
  const wishlist = useWishlist();
  const toast = useToast();
  const saved = wishlist.has(product.id);
  const avail = mockAvailability(product.id);

  return (
    <>
      <div className="w-[220px] flex-shrink-0 group">
        <div className="relative aspect-square overflow-hidden rounded-soft bg-sand mb-3">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] cursor-pointer"
            loading="lazy"
            onClick={() => {
              setActiveProduct(product);
              setOpen(true);
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
            }}
          />
          <button
            type="button"
            onClick={() => {
              const result = wishlist.toggle(product.id);
              toast(result === "added" ? "Saved to your wishlist." : "Removed from wishlist.");
            }}
            className={`absolute right-2 top-2 rounded-full p-2 backdrop-blur transition-all duration-300 ${
              saved
                ? "opacity-100 bg-panel/90 text-accent"
                : "opacity-0 group-hover:opacity-100 bg-panel/80 text-ink/70 hover:text-accent"
            }`}
            aria-label="Toggle wishlist"
          >
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
          </button>
          {complimentary ? (
            <span className="absolute left-2 top-2 rounded-soft bg-accent px-2 py-1 text-[10px] uppercase tracking-widest text-ink">
              Complimentary
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="text-left"
          onClick={() => {
            setActiveProduct(product);
            setOpen(true);
          }}
        >
          <p className="text-sm leading-snug line-clamp-2">{product.name}</p>
          <p className="text-[11px] text-ink/55 mt-1">
            {avail.storeName} · {avail.stockCount} in stock
          </p>
        </button>
      </div>
      <ProductQuickViewModal
        open={open}
        product={activeProduct}
        catalog={catalog}
        reserved={reserved}
        onReservedChange={setReserved}
        onClose={() => setOpen(false)}
        onOpenCart={onOpenCart}
        showAddToCart={activeProduct?.masterCategory !== "Free Items"}
        onOpenSimilar={(p) => {
          setActiveProduct(p);
        }}
      />
    </>
  );
}
