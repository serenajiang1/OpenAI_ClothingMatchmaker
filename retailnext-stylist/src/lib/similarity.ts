import type { EmbeddedProduct, CatalogProduct, MatchResult } from "@/types";
import { openai } from "./openai";

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-12);
}

export async function embedQueries(queries: string[]): Promise<number[][]> {
  const out = await openai.embeddings.create({
    model: "text-embedding-3-large",
    dimensions: 256,
    input: queries,
  });
  return out.data.map((d) => d.embedding);
}

export function matchItems(
  itemDescriptions: string[],
  itemEmbeddings: number[][],
  catalog: EmbeddedProduct[],
  filterGender: string,
  topK = 3,
  threshold = 0.3
): MatchResult[] {
  const pool = catalog.filter((p) => p.gender === filterGender || p.gender === "Unisex");

  return itemDescriptions.map((query, i) => {
    const qEmb = itemEmbeddings[i];
    const scored = pool.map((p) => ({ ...p, score: cosine(qEmb, p.embedding) }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter((s) => s.score >= threshold).slice(0, topK);
    return { query, matches: top };
  });
}

export function dedupeAndGroup(
  results: MatchResult[]
): Record<string, Array<CatalogProduct & { score: number }>> {
  const seen = new Map<string, CatalogProduct & { score: number }>();
  for (const r of results) {
    for (const m of r.matches) {
      const existing = seen.get(m.id);
      if (!existing || m.score > existing.score) seen.set(m.id, m);
    }
  }

  const grouped: Record<string, Array<CatalogProduct & { score: number }>> = {};
  for (const p of seen.values()) {
    const key = p.subCategory || p.articleType;
    (grouped[key] ??= []).push(p);
  }
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => b.score - a.score);
  }
  return grouped;
}
