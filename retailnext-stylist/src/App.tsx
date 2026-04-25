import { useEffect, useMemo, useState } from "react";
import catalog from "@/data/catalog.json";
import type { CatalogProduct, Screen } from "@/types";
import { HomeScreen } from "@/components/HomeScreen";
import { ChatScreen } from "@/components/ChatScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import { usePipeline } from "@/hooks/usePipeline";

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

  const articleTypes = useMemo(() => [...new Set(TYPED_CATALOG.map((p) => p.articleType))].sort(), []);

  const { state, grouped, run } = usePipeline(articleTypes);

  useEffect(() => {
    if (screen === "loading" && state.stage === "done") {
      const t = setTimeout(() => setScreen("results"), 400);
      return () => clearTimeout(t);
    }
  }, [screen, state.stage]);

  return (
    <div className="min-h-screen bg-cream text-ink">
      {screen === "home" && (
        <HomeScreen
          catalog={TYPED_CATALOG}
          articleTypes={articleTypes}
          onSearch={(q) => {
            setSeedQuery(q);
            setScreen("chat");
          }}
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
          onReset={() => {
            setSeedQuery("");
            setScreen("home");
          }}
        />
      )}
    </div>
  );
}
