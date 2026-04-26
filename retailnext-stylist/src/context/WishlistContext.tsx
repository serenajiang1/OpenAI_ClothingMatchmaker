import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WishlistCtx = {
  ids: ReadonlySet<string>;
  toggle: (id: string) => "added" | "removed";
  has: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistCtx | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string): "added" | "removed" => {
    let result: "added" | "removed" = "removed";
    setIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
        result = "removed";
      } else {
        n.add(id);
        result = "added";
      }
      return n;
    });
    return result;
  }, []);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  const value = useMemo(() => ({ ids, toggle, has }), [ids, toggle, has]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistCtx {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
}
