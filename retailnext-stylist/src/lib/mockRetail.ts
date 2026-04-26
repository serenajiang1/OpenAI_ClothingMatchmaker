import type { CatalogProduct } from "@/types";

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

const STORES = [
  "RetailNext Fifth Avenue, New York",
  "RetailNext Magnificent Mile, Chicago",
  "RetailNext Rodeo Drive, Beverly Hills",
  "RetailNext Brickell City Centre, Miami",
  "RetailNext NorthPark Center, Dallas",
] as const;

/** Deterministic mock availability for demo UI. */
export function mockAvailability(productId: string): { storeName: string; stockCount: number } {
  const h = hashString(productId);
  return {
    storeName: STORES[h % STORES.length],
    stockCount: 2 + (h % 14),
  };
}

/** Deterministic “similar taste” picks from the live catalog (no hardcoded product lists). */
export function mockSimilarProducts(productId: string, catalog: CatalogProduct[], count: number): CatalogProduct[] {
  const pool = catalog.filter((p) => p.id !== productId);
  if (pool.length === 0) return [];
  const h = hashString(productId);
  const out: CatalogProduct[] = [];
  const seen = new Set<string>();
  for (let k = 0; k < pool.length && out.length < count; k += 1) {
    const idx = (h + k * 17) % pool.length;
    const p = pool[idx]!;
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}
