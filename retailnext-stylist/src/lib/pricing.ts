import catalog from "@/data/catalog.json";
import type { CatalogProduct } from "@/types";

const CATALOG = catalog as CatalogProduct[];
const CATEGORY_BY_ID = new Map(CATALOG.map((p) => [p.id, p.masterCategory]));

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function priceFor(productId: string): number {
  if (CATEGORY_BY_ID.get(productId) === "Free Items") {
    return 0;
  }
  const h = hashString(productId);
  const base = 40 + (h % 241);
  return base + 0.99;
}

export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}
