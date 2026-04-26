import type { CatalogProduct, ScoredCatalogProduct } from "@/types";

const FREE_GIFT_FALLBACK_ID = "53619";

export function pickFreeGift(
  grouped: Record<string, ScoredCatalogProduct[]>,
  catalog: CatalogProduct[]
): CatalogProduct & { score?: number } {
  const matched = Object.values(grouped)
    .flat()
    .filter((p) => p.masterCategory === "Free Items")
    .sort((a, b) => b.score - a.score);

  if (matched.length > 0) {
    return matched[0];
  }

  const fallback = catalog.find((p) => p.id === FREE_GIFT_FALLBACK_ID);
  if (fallback) {
    return fallback;
  }

  const anyFreeItem = catalog.find((p) => p.masterCategory === "Free Items");
  if (anyFreeItem) {
    return anyFreeItem;
  }

  // Defensive: contract says "never null", so fall back to first catalog item.
  return catalog[0];
}
