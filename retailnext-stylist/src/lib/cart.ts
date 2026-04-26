import catalog from "@/data/catalog.json";
import type { CartItem, CatalogProduct } from "@/types";

const STORAGE_KEY = "retailnext_cart_v1";
const CATALOG = catalog as CatalogProduct[];
const PRODUCT_BY_ID = new Map(CATALOG.map((p) => [p.id, p]));

function emitChanged(pulse = false): void {
  window.dispatchEvent(new CustomEvent("cart:changed"));
  if (pulse) {
    window.dispatchEvent(new CustomEvent("cart:pulse"));
  }
}

function readCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((i) => ({ id: String(i?.id ?? ""), qty: Number(i?.qty ?? 0) }))
      .filter((i) => i.id && Number.isFinite(i.qty) && i.qty > 0);
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[], pulse = false): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  emitChanged(pulse);
}

export function getCart(): CartItem[] {
  return readCart();
}

export function addToCart(id: string): boolean {
  const product = PRODUCT_BY_ID.get(id);
  if (!product || product.masterCategory === "Free Items") {
    return false;
  }

  const items = readCart();
  const found = items.find((i) => i.id === id);
  if (found) {
    found.qty = Math.min(5, found.qty + 1);
  } else {
    items.push({ id, qty: 1 });
  }
  writeCart(items, true);
  return true;
}

export function removeFromCart(id: string): void {
  writeCart(readCart().filter((i) => i.id !== id));
}

export function setQty(id: string, n: number): void {
  const product = PRODUCT_BY_ID.get(id);
  if (!product || product.masterCategory === "Free Items") {
    return;
  }
  const qty = Math.max(1, Math.min(5, Math.floor(n)));
  const items = readCart();
  const found = items.find((i) => i.id === id);
  if (!found) return;
  found.qty = qty;
  writeCart(items);
}

export function clearCart(): void {
  writeCart([]);
}

export function getCartCount(): number {
  return readCart().reduce((sum, i) => sum + i.qty, 0);
}
