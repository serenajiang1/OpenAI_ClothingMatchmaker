import { useState, useCallback } from "react";
import {
  generateOutfitImage,
  analyzeOutfitImage,
  matchAgainstCatalog,
  loadEmbeddedCatalog,
} from "@/lib/pipeline";
import type { Intent, PipelineState, CatalogProduct } from "@/types";

export function usePipeline(articleTypes: string[]) {
  const [state, setState] = useState<PipelineState>({
    intent: null,
    dalleImageUrl: null,
    analyzed: null,
    results: null,
    stage: "idle",
    error: null,
  });
  const [grouped, setGrouped] = useState<Record<string, Array<CatalogProduct & { score: number }>> | null>(
    null
  );

  const run = useCallback(
    async (intent: Intent) => {
      setState({
        intent,
        dalleImageUrl: null,
        analyzed: null,
        results: null,
        stage: "generating",
        error: null,
      });
      try {
        const catalogPromise = loadEmbeddedCatalog();

        const dalleUrl = await generateOutfitImage(intent);
        setState((s) => ({ ...s, dalleImageUrl: dalleUrl, stage: "analyzing" }));

        const analyzed = await analyzeOutfitImage(dalleUrl, articleTypes);
        setState((s) => ({ ...s, analyzed, stage: "matching" }));

        const catalog = await catalogPromise;
        const groups = await matchAgainstCatalog(analyzed, intent, catalog);
        setGrouped(groups);
        setState((s) => ({ ...s, stage: "done" }));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        console.error(err);
        setState((s) => ({ ...s, stage: "error", error: message }));
      }
    },
    [articleTypes]
  );

  return { state, grouped, run };
}
