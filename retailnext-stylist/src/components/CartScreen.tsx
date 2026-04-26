import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockAvailability } from "@/lib/mockRetail";
import { clearCart, removeFromCart, setQty } from "@/lib/cart";
import { formatPrice, priceFor } from "@/lib/pricing";
import type { CartItem, CatalogProduct } from "@/types";

interface Props {
  cart: CartItem[];
  catalog: CatalogProduct[];
  freeGift: CatalogProduct;
  onBack: () => void;
  onPlaced: () => void;
}

function confirmationNumber(cart: CartItem[]): string {
  const raw = cart
    .map((i) => `${i.id}:${i.qty}`)
    .sort()
    .join("|");
  let h = 0;
  for (let i = 0; i < raw.length; i += 1) {
    h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `RN-${(h % 1_000_000).toString().padStart(6, "0")}`;
}

export function CartScreen({ cart, catalog, freeGift, onBack, onPlaced }: Props) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [giftRemoved, setGiftRemoved] = useState(false);
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const productById = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const rows = cart
    .map((c) => ({ item: c, product: productById.get(c.id) }))
    .filter((r): r is { item: CartItem; product: CatalogProduct } => Boolean(r.product));

  const subtotal = rows.reduce((sum, r) => sum + priceFor(r.product.id) * r.item.qty, 0);
  const count = rows.reduce((sum, r) => sum + r.item.qty, 0);
  const confirmation = confirmationNumber(cart);

  return (
    <div className="max-w-[1280px] mx-auto px-8 md:px-12 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="font-display text-2xl font-light tracking-[0.2em]">RETAILNEXT</h1>
        <button onClick={onBack} className="text-xs uppercase tracking-widest text-ink/60 hover:text-ink">
          ← Continue shopping
        </button>
      </header>

      <h2 className="font-display text-4xl font-light">Your bag</h2>
      <p className="mt-2 text-sm text-ink/60">
        {count} items · subtotal {formatPrice(subtotal)}
      </p>

      {rows.length === 0 ? (
        <div className="mt-16 rounded-soft border border-ink/10 bg-panel p-10 text-left">
          <p className="font-display text-3xl font-light">Your bag is empty</p>
          <Button className="mt-6 rounded-soft bg-ink text-cream hover:bg-accent" onClick={onBack}>
            Continue shopping
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {rows.map(({ item, product }) => {
              const availability = mockAvailability(product.id);
              const unit = priceFor(product.id);
              return (
                <div key={product.id} className="rounded-soft border border-ink/10 bg-panel p-4">
                  <div className="grid gap-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                    <div className="h-[120px] w-[120px] overflow-hidden rounded-soft bg-sand">
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="font-medium text-ink">{product.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-wider text-ink/50">{product.articleType}</p>
                      <p className="mt-2 text-xs text-ink/60">
                        {availability.storeName} · {availability.stockCount} in stock
                      </p>
                    </div>
                    <div className="flex min-w-[160px] flex-col items-end gap-2">
                      <select
                        value={item.qty}
                        onChange={(e) => setQty(product.id, Number(e.target.value))}
                        className="rounded-soft border border-ink/20 bg-cream px-2 py-1 text-sm"
                      >
                        {[1, 2, 3, 4, 5].map((q) => (
                          <option key={q} value={q}>
                            Qty {q}
                          </option>
                        ))}
                      </select>
                      <p className="text-sm">{formatPrice(unit * item.qty)}</p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        className="text-xs uppercase tracking-widest text-ink/50 hover:text-ink"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {!giftRemoved ? (
              <div className="rounded-soft border border-ink/10 bg-panel p-4">
                <div className="grid gap-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                  <div className="h-[120px] w-[120px] overflow-hidden rounded-soft bg-sand">
                    <img src={freeGift.image} alt={freeGift.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">{freeGift.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-ink/50">{freeGift.articleType}</p>
                  </div>
                  <div className="flex min-w-[160px] flex-col items-end gap-2">
                    <span className="inline-flex rounded-soft bg-accent px-2 py-1 text-[10px] uppercase tracking-widest text-ink">
                      Complimentary
                    </span>
                    <button
                      type="button"
                      onClick={() => setGiftRemoved(true)}
                      className="text-xs uppercase tracking-widest text-ink/50 hover:text-ink"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="h-fit rounded-soft border border-ink/10 bg-panel p-5">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink/60">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink/60">Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="border-t border-ink/10 pt-3 flex justify-between font-medium">
                <span>Total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            </div>
            <Button
              className="mt-6 w-full rounded-soft bg-ink py-4 text-cream hover:bg-accent"
              onClick={() => setShowConfirmation(true)}
            >
              Place order
            </Button>
          </aside>
        </div>
      )}

      {showConfirmation ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-ink/35" onClick={() => setShowConfirmation(false)} />
          <div className="relative z-[91] w-full max-w-md rounded-soft border border-ink/10 bg-panel p-8 text-center shadow-2xl">
            <h3 className="font-display text-4xl font-light">Order placed</h3>
            <p className="mt-3 text-sm text-ink/70">Confirmation number: {confirmation}</p>
            <p className="mt-1 text-sm text-ink/60">Confirmation sent to your email</p>

            <div className="mt-6 rounded-soft border border-ink/10 bg-cream/70 p-4 text-left">
              <p className="font-display text-2xl font-light text-ink">Leave a quick review</p>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewStars(s)}
                    className="rounded-full p-1"
                    aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                  >
                    <Star
                      size={18}
                      className={s <= reviewStars ? "text-accent" : "text-ink/30"}
                      fill={s <= reviewStars ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tell us about your styling experience..."
                rows={4}
                className="mt-3 w-full rounded-soft border border-ink/15 bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink/45 focus:border-ink/30 focus:outline-none"
              />
            </div>

            <Button
              className="mt-6 rounded-soft bg-ink text-cream hover:bg-accent"
              onClick={() => {
                clearCart();
                setShowConfirmation(false);
                setReviewStars(0);
                setReviewText("");
                onPlaced();
              }}
            >
              Submit review
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
