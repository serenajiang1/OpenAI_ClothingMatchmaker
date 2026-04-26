import { useEffect, useMemo, useState } from "react";
import { ShoppingBag } from "lucide-react";
import catalog from "@/data/catalog.json";
import type { CartItem, CatalogProduct, Screen } from "@/types";
import { HomeScreen } from "@/components/HomeScreen";
import { ChatScreen } from "@/components/ChatScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import { CartScreen } from "@/components/CartScreen";
import { usePipeline } from "@/hooks/usePipeline";
import { ToastProvider } from "@/context/ToastContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { getCart, getCartCount } from "@/lib/cart";
import { pickFreeGift } from "@/lib/free-gift";

const TYPED_CATALOG = catalog as CatalogProduct[];

export default function App() {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-8">
        <div>
          <h1 className="font-display text-3xl mb-4">Configuration Missing</h1>
          <p className="text-ink/70">
            Set <code>VITE_OPENAI_API_KEY</code> in .env and restart.
          </p>
        </div>
      </div>
    );
  }

  const [screen, setScreen] = useState<Screen>("home");
  const [seedQuery, setSeedQuery] = useState<string>("");
  const [cartCount, setCartCount] = useState(0);
  const [cartPulse, setCartPulse] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const articleTypes = useMemo(() => [...new Set(TYPED_CATALOG.map((p) => p.articleType))].sort(), []);
  /** Homepage category pills: omit article types that only exist on Free Items (e.g. Free Gifts). */
  const homeFilterArticleTypes = useMemo(
    () =>
      [...new Set(TYPED_CATALOG.filter((p) => p.masterCategory !== "Free Items").map((p) => p.articleType))].sort(),
    []
  );

  const { state, grouped, run } = usePipeline(articleTypes);
  const freeGift = useMemo(
    () => pickFreeGift(grouped ?? {}, TYPED_CATALOG),
    [grouped]
  );

  useEffect(() => {
    if (screen === "loading" && state.stage === "done") {
      const t = setTimeout(() => setScreen("results"), 400);
      return () => clearTimeout(t);
    }
  }, [screen, state.stage]);

  useEffect(() => {
    const sync = () => {
      setCartCount(getCartCount());
      setCartItems(getCart());
    };
    const onPulse = () => {
      setCartPulse(true);
      window.setTimeout(() => setCartPulse(false), 600);
    };
    sync();
    window.addEventListener("cart:changed", sync);
    window.addEventListener("cart:pulse", onPulse);
    return () => {
      window.removeEventListener("cart:changed", sync);
      window.removeEventListener("cart:pulse", onPulse);
    };
  }, []);

  return (
    <ToastProvider>
      <WishlistProvider>
        <div className="min-h-screen bg-cream text-ink">
          {cartCount > 0 ? (
            <button
              type="button"
              onClick={() => setScreen("cart")}
              className={`fixed right-6 top-6 z-[95] inline-flex h-10 items-center gap-2 rounded-full border border-ink/10 bg-panel px-3 text-ink shadow-md transition ${
                cartPulse ? "scale-105" : ""
              }`}
            >
              <ShoppingBag size={16} />
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] text-cream">
                {cartCount}
              </span>
            </button>
          ) : null}
          {screen === "home" && (
            <HomeScreen
              catalog={TYPED_CATALOG}
              articleTypes={homeFilterArticleTypes}
              onSearch={(q) => {
                setSeedQuery(q);
                setScreen("chat");
              }}
              onOpenCart={() => setScreen("cart")}
            />
          )}
          {screen === "chat" && (
            <ChatScreen
              seedQuery={seedQuery}
              onIntent={(intent) => {
                setScreen("loading");
                void run(intent);
              }}
              onBack={() => {
                setSeedQuery("");
                setScreen("home");
              }}
            />
          )}
          {screen === "loading" && <LoadingScreen state={state} />}
          {screen === "results" && state.intent && grouped && (
            <ResultsScreen
              intent={state.intent}
              dalleImageUrl={state.dalleImageUrl!}
              grouped={grouped}
              catalog={TYPED_CATALOG}
              onOpenCart={() => setScreen("cart")}
              onReset={() => {
                setSeedQuery("");
                setScreen("home");
              }}
            />
          )}
          {screen === "cart" && (
            <CartScreen
              cart={cartItems}
              catalog={TYPED_CATALOG}
              freeGift={freeGift}
              onBack={() => setScreen("home")}
              onPlaced={() => setScreen("home")}
            />
          )}
        </div>
      </WishlistProvider>
    </ToastProvider>
  );
}
