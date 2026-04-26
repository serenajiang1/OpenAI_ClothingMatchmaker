import { useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogProduct } from "@/types";
import { mockAvailability, mockSimilarProducts } from "@/lib/mockRetail";
import { useToast } from "@/context/ToastContext";
import { useWishlist } from "@/context/WishlistContext";
import { addToCart } from "@/lib/cart";

export interface QuickViewMatchMeta {
  query: string;
  score: number;
}

interface Props {
  open: boolean;
  product: CatalogProduct | null;
  catalog: CatalogProduct[];
  reserved: boolean;
  onReservedChange: (next: boolean) => void;
  onClose: () => void;
  onOpenCart: () => void;
  /** When set, tapping a similar product opens that product (clears match meta). */
  onOpenSimilar?: (p: CatalogProduct) => void;
  showAddToCart?: boolean;
}

export function ProductQuickViewModal({
  open,
  product,
  catalog,
  reserved,
  onReservedChange,
  onClose,
  onOpenCart,
  onOpenSimilar,
  showAddToCart = true,
}: Props) {
  const toast = useToast();
  const wishlist = useWishlist();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !product) return null;

  const avail = mockAvailability(product.id);
  const similar = mockSimilarProducts(product.id, catalog, 6);
  const saved = wishlist.has(product.id);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#2a201a]/40 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-[81] max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-soft border border-ink/10 bg-cream p-6 shadow-2xl"
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs uppercase tracking-widest text-ink/50 hover:bg-sand hover:text-ink"
          >
            Close
          </button>
        </div>

        <div className="mt-2 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="group relative overflow-hidden rounded-soft bg-sand">
            <img
              src={product.image}
              alt={product.name}
              className="h-full max-h-[420px] w-full object-cover"
            />
            <button
              type="button"
              onClick={() => {
                const result = wishlist.toggle(product.id);
                toast(result === "added" ? "Saved to your wishlist." : "Removed from wishlist.");
              }}
              className={`absolute right-3 top-3 rounded-full p-2 backdrop-blur transition-all duration-300 ${
                saved
                  ? "opacity-100 bg-panel/90 text-accent"
                  : "opacity-0 group-hover:opacity-100 bg-panel/80 text-ink/70 hover:text-accent"
              }`}
              aria-label="Toggle wishlist"
            >
              <Heart size={16} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink/45">{product.articleType}</p>
              <h2 className="font-display text-2xl font-light leading-snug text-ink md:text-3xl">{product.name}</h2>
            </div>

            <div className="rounded-soft border border-ink/10 bg-cream/80 p-4">
              <p className="text-[10px] uppercase tracking-widest text-ink/45">In-store availability</p>
              <p className="mt-1 text-sm text-ink">
                <span className="font-medium">{avail.storeName}</span>
                <span className="text-ink/50"> · </span>
                <span>{avail.stockCount} in stock</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                className={`rounded-soft px-6 transition-colors ${
                  reserved ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-ink text-cream hover:bg-ink/90"
                }`}
                onClick={() => {
                  const next = !reserved;
                  onReservedChange(next);
                  toast(next ? "Reserved — we'll hold it for 24 hours." : "Reservation released.");
                }}
              >
                {reserved ? "Reserved" : "Reserve in store"}
              </Button>
              {showAddToCart ? (
                <Button
                  type="button"
                  className="rounded-soft bg-accent text-ink hover:bg-accent/90"
                  onClick={() => {
                    const added = addToCart(product.id);
                    if (added) {
                      toast("Added to your cart", { label: "View cart", onClick: onOpenCart });
                    }
                  }}
                >
                  Add to cart
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-ink/10 pt-6">
          <h3 className="font-display text-xl font-light text-ink">Customers with similar taste also chose</h3>
          <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {similar.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (onOpenSimilar) {
                    onOpenSimilar(p);
                  } else {
                    toast("Added to your browsing trail.");
                  }
                }}
                className="w-[88px] flex-shrink-0 text-left"
              >
                <div className="aspect-square overflow-hidden rounded-soft bg-sand">
                  <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-ink/70">{p.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
