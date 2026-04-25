# BUILD.md — RetailNext AI Stylist (Demo App)

You are building a demo web app for RetailNext, a Fortune 1000 department store. It will be shown to their CTO and Head of Innovation. A customer describes an event in natural language, an AI generates a flat-lay outfit image via DALL-E 3, then a RAG pipeline matches that image's items against a real product catalog and surfaces matching products grouped by category.

Execute every phase below in order. Do not skip ahead. After each phase, verify it succeeded before moving to the next.

---

## ⚠ Non-negotiable invariants

These are encoded in the four `.cursor/rules/*.mdc` files which auto-inject on every agent turn. Restating here for emphasis:

1. **Path aliases must be configured in `tsconfig.json` AND `tsconfig.app.json` AND `vite.config.ts`.** Missing any one silently breaks all shadcn imports.
2. **Never hardcode category lists.** All `articleType`, `subCategory`, etc. derive from `catalog.json` at runtime.
3. **`catalog_with_embeddings.json` is fetched, never imported.** It's ~80–100 MB and will OOM the bundler if imported.
4. **DALL-E URLs go directly to vision and `<img>`.** Never `fetch()` them client-side, never base64-encode them.

---

## Phase 1 — Project scaffolding

Run `setup.sh`:

```bash
chmod +x setup.sh
./setup.sh
```

This script:
1. Scaffolds Vite + React + TypeScript (`npm create vite@latest`)
2. Installs dependencies: `openai`, `tailwindcss@3`, `postcss`, `autoprefixer`, `@types/node`
3. Creates the empty stub tree (`src/lib/*.ts`, `src/components/*.tsx`, etc.)
4. Moves the operator's hand-off data (`_handoff_catalog.json` → `src/data/catalog.json`, `_handoff_public/` → `public/`)

**Verify Phase 1:**

- `package.json` exists with vite/react deps
- `src/data/catalog.json` exists and is non-empty (operator hand-off worked)
- `public/data/catalog_with_embeddings.json` exists (~80–100 MB)
- `public/images/` contains ~30,000 jpg files
- Stub tree exists: `src/lib/openai.ts`, `src/components/HomeScreen.tsx`, etc., all empty
- The four rules files exist in `.cursor/rules/`

If any verify item fails, fix before proceeding. If catalog.json or catalog_with_embeddings.json is missing, the operator skipped step 4 of the runbook — stop and tell them.

---

## Phase 2 — Configuration files

### 2.1 `tailwind.config.js`

Replace contents:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: "#1a1a1a",
        cream: "#faf8f5",
        sand: "#ebe5dc",
        accent: "#8b6f47",
      },
    },
  },
  plugins: [],
};
```

### 2.2 `src/index.css`

Replace contents:

```css
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; background: #faf8f5; color: #1a1a1a; }
body { font-family: 'Inter', system-ui, sans-serif; }
.font-display { font-family: 'Cormorant Garamond', Georgia, serif; }

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

### 2.3 Path aliases — three places

The `path-aliases.mdc` rule covers this in detail. Apply all three.

**`tsconfig.json`** — replace contents:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**`tsconfig.app.json`** — Vite generated this. Read it, then merge `baseUrl` and `paths` into the existing `compilerOptions` block. Do not overwrite the rest.

**`vite.config.ts`** — replace contents:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Verify Phase 2:** Run `npx tsc --noEmit` from project root. Should complete with no errors. If it errors with `Cannot find module '@/...'`, one of the three path-alias places is wrong.

---

## Phase 3 — shadcn/ui initialisation

```bash
npx shadcn@latest init
```

(Note: the package was renamed from `shadcn-ui` to `shadcn` in 2024. Use `shadcn@latest`.)

Answer the prompts:
- TypeScript: yes
- Style: Default
- Base color: Neutral
- CSS variables: yes
- Components dir: `@/components`
- Utils: `@/lib/utils`

Then add the components used:

```bash
npx shadcn@latest add button input card scroll-area skeleton badge
```

This creates `src/components/ui/*.tsx` files. Don't edit them.

**Verify Phase 3:** `src/components/ui/button.tsx` exists. Test resolves: create a one-line file `src/__test_resolve.ts` containing `import { Button } from "@/components/ui/button";` then run `npx tsc --noEmit`. Should succeed. Delete the test file.

---

## Phase 4 — Implementation

Fill in the empty stub files. The order below matches dependency order — earlier files are imported by later ones.

### 4.1 `src/types/index.ts`

```typescript
export interface CatalogProduct {
  id: string;
  name: string;
  articleType: string;
  masterCategory: string;
  subCategory: string;
  gender: "Men" | "Women" | "Boys" | "Girls" | "Unisex";
  season: string;
  usage: string;
  baseColour: string;
  image: string;
}

export interface EmbeddedProduct extends CatalogProduct {
  embedding: number[];
}

export type Gender = "Women" | "Men";
export type Season = "Summer" | "Winter" | "Fall" | "Spring";

export interface Intent {
  occasion: string;
  gender: Gender;
  season: Season;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AnalyzedImage {
  items: string[];
  category: string;
  gender: string;
}

export interface MatchResult {
  query: string;
  matches: Array<CatalogProduct & { score: number }>;
}

export type Screen = "home" | "chat" | "loading" | "results";

export interface PipelineState {
  intent: Intent | null;
  dalleImageUrl: string | null;
  analyzed: AnalyzedImage | null;
  results: MatchResult[] | null;
  stage: "idle" | "generating" | "analyzing" | "matching" | "done" | "error";
  error: string | null;
}
```

### 4.2 `src/lib/openai.ts`

```typescript
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});
```

### 4.3 `src/lib/prompts.ts` — verbatim prompts

```typescript
export const CONVERSATION_SYSTEM_PROMPT = `You are a warm, knowledgeable personal stylist for RetailNext, a premium department store. Your job is to help the customer find the perfect outfit for an upcoming event.

You need to collect exactly three pieces of information before recommending anything:
1. occasion — what is the event? (e.g. "summer wedding", "job interview", "beach holiday", "first date")
2. gender — must be exactly "Women" or "Men"
3. season — must be exactly one of "Summer", "Winter", "Fall", "Spring"

Rules:
- Look at what the customer has already told you and ONLY ask about fields that are still missing.
- Ask about ONE missing field at a time. Never bundle questions.
- Keep messages short, conversational, and warm — one or two sentences.
- Do not recommend products yet. Your job at this stage is only to gather context.
- If the customer's first message already contains all three fields, skip ahead and confirm understanding in a single short sentence.
- When you have ALL three fields collected (and only then), end your message with a special block on its own lines:

|||INTENT|||{"occasion":"<value>","gender":"<Women|Men>","season":"<Summer|Winter|Fall|Spring>"}|||END|||

The block must be valid JSON. The visible part of your message before the block should be a brief, warm acknowledgement like "Perfect — let me put together some looks for your summer wedding." Do not mention the |||INTENT||| block to the customer.

If the customer says something ambiguous about gender (e.g. "I'm shopping for my partner") just ask: "Should I shop in womenswear or menswear for them?"
If they give a vague season ("for next month"), ask which season that falls in for them.`;

export const dallePromptFor = (intent: { occasion: string; gender: string; season: string }) =>
  `A high-quality flat-lay editorial photograph of a complete ${intent.gender.toLowerCase()}'s outfit suitable for a ${intent.occasion} during ${intent.season.toLowerCase()}. Show 4 to 6 individual clothing and accessory items neatly arranged on a clean pure-white seamless background, viewed from directly above (top-down). Items should be clearly separated with even spacing — no overlap. Include the main garment(s), shoes, and 1-2 complementing accessories (bag, sunglasses, jewellery, belt, or scarf as appropriate). Style: clean, minimalist, premium fashion magazine aesthetic with soft natural shadow. No people, no models, no mannequins — only the items laid flat. No text, no logos, no watermarks.`;

export const imageAnalysisPrompt = (articleTypes: string[]) =>
  `You are analysing a flat-lay editorial photograph of a complete outfit. Identify each individual clothing item and accessory visible in the image.

For each item, provide a single descriptive title that includes:
- the dominant colour
- one or two style/material descriptors
- the gender
- the item type (e.g. "dress", "blazer", "loafers")

Example titles: "Sage Green Lightweight Women's Midi Dress", "Tan Leather Men's Derby Shoes", "Cream Wool Women's Tailored Blazer".

Return ONLY a JSON object — no prose, no markdown fencing — with this exact shape:

{
  "items": ["<descriptive title 1>", "<descriptive title 2>", ...],
  "category": "<one value from the list below>",
  "gender": "<Men | Women | Boys | Girls | Unisex>"
}

The "category" field MUST be exactly one value chosen from this list (the dominant or hero item's category):
${articleTypes.join(", ")}

The "items" array should contain 4-6 entries — one per visible item.`;
```

The `articleTypes` argument to `imageAnalysisPrompt` comes from runtime catalog inspection — never hardcoded.

### 4.4 `src/lib/intent.ts`

```typescript
import type { Intent } from "@/types";

const INTENT_RE = /\|\|\|INTENT\|\|\|([\s\S]*?)\|\|\|END\|\|\|/;

export function parseIntent(message: string): { visible: string; intent: Intent | null } {
  const match = message.match(INTENT_RE);
  if (!match) return { visible: message.trim(), intent: null };

  const visible = message.replace(INTENT_RE, "").trim();
  try {
    const parsed = JSON.parse(match[1].trim());
    if (
      typeof parsed.occasion === "string" &&
      (parsed.gender === "Women" || parsed.gender === "Men") &&
      ["Summer", "Winter", "Fall", "Spring"].includes(parsed.season)
    ) {
      return { visible, intent: parsed as Intent };
    }
  } catch {}
  return { visible, intent: null };
}
```

### 4.5 `src/lib/similarity.ts`

```typescript
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
  const pool = catalog.filter(
    (p) => p.gender === filterGender || p.gender === "Unisex"
  );

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
  // Flatten + dedupe by id, keeping highest score
  const seen = new Map<string, CatalogProduct & { score: number }>();
  for (const r of results) {
    for (const m of r.matches) {
      const existing = seen.get(m.id);
      if (!existing || m.score > existing.score) seen.set(m.id, m);
    }
  }
  // Group by subCategory (fall back to articleType) — derived from actual matched products
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
```

### 4.6 `src/lib/pipeline.ts`

```typescript
import { openai } from "./openai";
import { dallePromptFor, imageAnalysisPrompt, CONVERSATION_SYSTEM_PROMPT } from "./prompts";
import { embedQueries, matchItems, dedupeAndGroup } from "./similarity";
import type { Intent, EmbeddedProduct, AnalyzedImage, ChatMessage } from "@/types";

// --- Stage 1: conversation turn ---
export async function chatTurn(
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const messages = [
    { role: "system" as const, content: CONVERSATION_SYSTEM_PROMPT },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userMessage },
  ];
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
  });
  return res.choices[0].message.content ?? "";
}

// --- Stage 2: DALL-E ---
export async function generateOutfitImage(intent: Intent): Promise<string> {
  const res = await openai.images.generate({
    model: "dall-e-3",
    prompt: dallePromptFor(intent),
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });
  const url = res.data?.[0]?.url;
  if (!url) throw new Error("DALL-E returned no URL");
  return url; // temporary Azure blob URL — pass directly to vision and to <img>
}

// --- Stage 3: vision analysis ---
export async function analyzeOutfitImage(
  imageUrl: string,
  articleTypes: string[]
): Promise<AnalyzedImage> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: imageAnalysisPrompt(articleTypes) },
          { type: "image_url", image_url: { url: imageUrl } }, // URL passed directly
        ],
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });
  const raw = res.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.items)) throw new Error("Vision: missing items[]");
  return parsed as AnalyzedImage;
}

// --- Stage 4: RAG match ---
export async function matchAgainstCatalog(
  analyzed: AnalyzedImage,
  intent: Intent,
  catalog: EmbeddedProduct[]
) {
  const itemEmbeddings = await embedQueries(analyzed.items);
  const results = matchItems(
    analyzed.items,
    itemEmbeddings,
    catalog,
    intent.gender,
    3,
    0.3
  );
  return dedupeAndGroup(results);
}

// --- catalog loader (lazy, cached, fetched not imported) ---
let _catalogCache: EmbeddedProduct[] | null = null;
export async function loadEmbeddedCatalog(): Promise<EmbeddedProduct[]> {
  if (_catalogCache) return _catalogCache;
  const res = await fetch("/data/catalog_with_embeddings.json");
  if (!res.ok) throw new Error(`Failed to load embeddings: ${res.status}`);
  _catalogCache = await res.json();
  return _catalogCache!;
}
```

### 4.7 `src/hooks/usePipeline.ts`

```typescript
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
  const [grouped, setGrouped] = useState<Record<string, Array<CatalogProduct & { score: number }>> | null>(null);

  const run = useCallback(async (intent: Intent) => {
    setState({ intent, dalleImageUrl: null, analyzed: null, results: null, stage: "generating", error: null });
    try {
      // Pre-warm embeddings load in parallel with DALL-E
      const catalogPromise = loadEmbeddedCatalog();

      const dalleUrl = await generateOutfitImage(intent);
      setState((s) => ({ ...s, dalleImageUrl: dalleUrl, stage: "analyzing" }));

      const analyzed = await analyzeOutfitImage(dalleUrl, articleTypes);
      setState((s) => ({ ...s, analyzed, stage: "matching" }));

      const catalog = await catalogPromise;
      const groups = await matchAgainstCatalog(analyzed, intent, catalog);
      setGrouped(groups);
      setState((s) => ({ ...s, stage: "done" }));
    } catch (err: any) {
      console.error(err);
      setState((s) => ({ ...s, stage: "error", error: err?.message ?? "Something went wrong" }));
    }
  }, [articleTypes]);

  return { state, grouped, run };
}
```

### 4.8 `src/components/ProductCard.tsx`

Image-dominant card, ~220px wide.

```tsx
import type { CatalogProduct } from "@/types";

export function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <div className="w-[220px] flex-shrink-0 group cursor-pointer">
      <div className="aspect-square overflow-hidden bg-sand mb-3">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.3"; }}
        />
      </div>
      <p className="text-sm leading-snug line-clamp-2">{product.name}</p>
      <p className="text-xs uppercase tracking-wide text-ink/50 mt-1">{product.articleType}</p>
    </div>
  );
}
```

### 4.9 `src/components/ProductRow.tsx`

```tsx
import type { CatalogProduct } from "@/types";
import { ProductCard } from "./ProductCard";

export function ProductRow({ title, products }: { title: string; products: CatalogProduct[] }) {
  return (
    <section className="mb-16">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-3xl">{title}</h2>
        <span className="text-xs uppercase tracking-widest text-ink/50">{products.length} items</span>
      </div>
      <div className="border-t border-ink/10 mb-6" />
      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
```

### 4.10 `src/components/CategoryPills.tsx`

```tsx
import { Badge } from "@/components/ui/badge";

interface Props {
  articleTypes: string[];   // derived from catalog at runtime
  selected: string | null;
  onSelect: (t: string | null) => void;
}

export function CategoryPills({ articleTypes, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-4 -mx-12 px-12">
      <Badge
        variant={selected === null ? "default" : "outline"}
        className="cursor-pointer flex-shrink-0 text-xs uppercase tracking-wide"
        onClick={() => onSelect(null)}
      >
        All
      </Badge>
      {articleTypes.map((t) => (
        <Badge
          key={t}
          variant={selected === t ? "default" : "outline"}
          className="cursor-pointer flex-shrink-0 text-xs uppercase tracking-wide"
          onClick={() => onSelect(t)}
        >
          {t}
        </Badge>
      ))}
    </div>
  );
}
```

### 4.11 `src/components/HomeScreen.tsx`

```tsx
import { useMemo, useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductRow } from "./ProductRow";
import { CategoryPills } from "./CategoryPills";
import type { CatalogProduct } from "@/types";

const PLACEHOLDERS = [
  "a summer wedding in Tuscany…",
  "my first day at a new job…",
  "a beach holiday in Bali…",
  "an autumn dinner party…",
];

interface Props {
  catalog: CatalogProduct[];
  articleTypes: string[];
  onSearch: (q: string) => void;
}

function shuffle<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export function HomeScreen({ catalog, articleTypes, onSearch }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [phIdx, setPhIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () => filter ? catalog.filter((p) => p.articleType === filter) : catalog,
    [catalog, filter]
  );
  const newIn = useMemo(() => shuffle(filtered, 30), [filtered]);
  const trending = useMemo(() => shuffle(filtered, 30), [filtered]);

  const submit = () => {
    if (query.trim()) onSearch(query.trim());
  };

  return (
    <div className="max-w-[1400px] mx-auto px-12">
      <header className="py-8 text-center">
        <h1 className="font-display text-3xl tracking-[0.2em]">RETAILNEXT</h1>
      </header>

      <section className="py-20 text-center">
        <h2 className="font-display text-5xl mb-10">What are you dressing for?</h2>
        <div className="max-w-2xl mx-auto flex gap-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={PLACEHOLDERS[phIdx]}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="flex-1 h-14 text-base bg-transparent border-ink/20 rounded-none"
          />
          <Button onClick={submit} className="h-14 px-8 rounded-none bg-ink hover:bg-accent">
            Style me
          </Button>
        </div>
      </section>

      <CategoryPills articleTypes={articleTypes} selected={filter} onSelect={setFilter} />

      <div className="py-12">
        <ProductRow title="New In" products={newIn} />
        <ProductRow title="Trending" products={trending} />
      </div>
    </div>
  );
}
```

### 4.12 `src/components/ChatScreen.tsx`

```tsx
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { chatTurn } from "@/lib/pipeline";
import { parseIntent } from "@/lib/intent";
import type { ChatMessage, Intent } from "@/types";

interface Props {
  seedQuery: string;
  onIntent: (intent: Intent) => void;
  onBack: () => void;
}

export function ChatScreen({ seedQuery, onIntent, onBack }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    (async () => {
      const seed: ChatMessage = { role: "user", content: seedQuery };
      setMessages([seed]);
      setLoading(true);
      try {
        const reply = await chatTurn([], seedQuery);
        const { visible, intent } = parseIntent(reply);
        setMessages((m) => [...m, { role: "assistant", content: visible }]);
        if (intent) {
          setTimeout(() => onIntent(intent), 1000);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [seedQuery, onIntent]);

  const submit = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    try {
      const reply = await chatTurn(messages, userMsg.content);
      const { visible, intent } = parseIntent(reply);
      setMessages((m) => [...m, { role: "assistant", content: visible }]);
      if (intent) {
        setTimeout(() => onIntent(intent), 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[720px] mx-auto px-12 min-h-screen flex flex-col">
      <header className="py-8 flex items-center justify-between">
        <button onClick={onBack} className="text-xs uppercase tracking-widest text-ink/60 hover:text-ink">
          ← back
        </button>
        <h1 className="font-display text-2xl tracking-[0.2em]">RETAILNEXT</h1>
        <div className="w-12" />
      </header>

      <div className="flex-1 py-12 space-y-12">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div className="text-[10px] uppercase tracking-widest text-ink/50 mb-2">
              {m.role === "user" ? "you" : "stylist"}
            </div>
            <div className={m.role === "user" ? "text-base" : "font-display text-2xl leading-snug"}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-widest text-ink/50 mb-2">stylist</div>
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-ink/30 animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-ink/30 animate-pulse [animation-delay:200ms]" />
              <span className="w-2 h-2 rounded-full bg-ink/30 animate-pulse [animation-delay:400ms]" />
            </div>
          </div>
        )}
      </div>

      <div className="py-8 flex gap-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type your reply…"
          disabled={loading}
          className="flex-1 h-12 bg-transparent border-ink/20 rounded-none"
        />
        <Button onClick={submit} disabled={loading} className="h-12 px-6 rounded-none bg-ink hover:bg-accent">
          Send
        </Button>
      </div>
    </div>
  );
}
```

### 4.13 `src/components/LoadingScreen.tsx`

```tsx
import type { PipelineState } from "@/types";

interface Props {
  state: PipelineState;
}

export function LoadingScreen({ state }: Props) {
  const steps = [
    { label: "Imagining your perfect look…", done: !!state.dalleImageUrl },
    { label: "Analyzing the style…", done: !!state.analyzed },
    { label: "Finding matches in our collection…", done: state.stage === "done" },
  ];

  if (state.stage === "error") {
    return (
      <div className="max-w-2xl mx-auto px-12 py-24 text-center">
        <h2 className="font-display text-3xl mb-4">Something went wrong</h2>
        <p className="text-ink/70">{state.error ?? "Please try again."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-12 py-24 text-center">
      {state.dalleImageUrl && (
        <div className="mb-12 animate-in fade-in duration-700">
          <img
            src={state.dalleImageUrl}
            alt="Your style inspiration"
            className="w-[360px] h-[360px] mx-auto rounded-sm shadow-xl object-cover"
          />
          <div className="text-[10px] uppercase tracking-widest text-ink/50 mt-4">
            your style inspiration
          </div>
        </div>
      )}

      <div className="space-y-6 max-w-md mx-auto">
        {steps.map((s, i) => {
          const inProgress = !s.done && (i === 0 || steps[i - 1].done);
          return (
            <div key={i} className="flex items-center gap-4 text-left">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                {s.done ? (
                  <span className="text-accent text-lg">✓</span>
                ) : inProgress ? (
                  <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />
                ) : (
                  <span className="w-3 h-3 rounded-full border border-ink/20" />
                )}
              </div>
              <span className={`font-display text-xl ${s.done ? "text-ink" : "text-ink/50"}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 4.14 `src/components/ResultsScreen.tsx`

```tsx
import { Button } from "@/components/ui/button";
import { ProductRow } from "./ProductRow";
import type { CatalogProduct, Intent } from "@/types";

interface Props {
  intent: Intent;
  dalleImageUrl: string;
  grouped: Record<string, Array<CatalogProduct & { score: number }>>;
  onReset: () => void;
}

export function ResultsScreen({ intent, dalleImageUrl, grouped, onReset }: Props) {
  const groupEntries = Object.entries(grouped).sort(
    ([, a], [, b]) => b.length - a.length
  );

  return (
    <div className="max-w-[1400px] mx-auto px-12">
      <header className="py-8 flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-[0.2em]">RETAILNEXT</h1>
        <button
          onClick={onReset}
          className="text-xs uppercase tracking-widest text-ink/60 hover:text-ink"
        >
          ← Start over
        </button>
      </header>

      <section className="py-12 flex items-start justify-between gap-12">
        <div className="flex-1">
          <div className="text-xs uppercase tracking-widest text-ink/50 mb-3">
            {intent.season} · {intent.gender}
          </div>
          <h2 className="font-display text-5xl leading-tight">
            Your looks for a {intent.occasion}
          </h2>
        </div>
        <div className="flex-shrink-0 text-center">
          <img
            src={dalleImageUrl}
            alt="Style inspiration"
            className="w-[180px] h-[180px] object-cover rounded-sm shadow-md"
          />
          <div className="text-[10px] uppercase tracking-widest text-ink/50 mt-2">
            style inspiration
          </div>
        </div>
      </section>

      <div className="py-12">
        {groupEntries.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-display text-2xl mb-6">
              We couldn't find quite the right matches — try a different occasion?
            </p>
            <Button onClick={onReset} className="rounded-none bg-ink hover:bg-accent">
              Start over
            </Button>
          </div>
        ) : (
          groupEntries.map(([groupName, products]) => (
            <ProductRow key={groupName} title={groupName} products={products} />
          ))
        )}
      </div>
    </div>
  );
}
```

### 4.15 `src/App.tsx`

Replace the Vite default with:

```tsx
import { useEffect, useMemo, useState } from "react";
import catalog from "@/data/catalog.json";
import type { CatalogProduct, Intent, Screen } from "@/types";
import { HomeScreen } from "@/components/HomeScreen";
import { ChatScreen } from "@/components/ChatScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import { usePipeline } from "@/hooks/usePipeline";

const TYPED_CATALOG = catalog as CatalogProduct[];

export default function App() {
  // API key check
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-8">
        <div>
          <h1 className="font-display text-3xl mb-4">Configuration Missing</h1>
          <p className="text-ink/70">Set <code>VITE_OPENAI_API_KEY</code> in .env and restart.</p>
        </div>
      </div>
    );
  }

  const [screen, setScreen] = useState<Screen>("home");
  const [seedQuery, setSeedQuery] = useState<string>("");

  // Derive unique articleTypes from catalog at runtime — never hardcoded
  const articleTypes = useMemo(
    () => [...new Set(TYPED_CATALOG.map((p) => p.articleType))].sort(),
    []
  );

  const { state, grouped, run } = usePipeline(articleTypes);

  // Auto-advance from loading → results
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
          onSearch={(q) => { setSeedQuery(q); setScreen("chat"); }}
        />
      )}
      {screen === "chat" && (
        <ChatScreen
          seedQuery={seedQuery}
          onIntent={(intent) => { setScreen("loading"); run(intent); }}
          onBack={() => { setSeedQuery(""); setScreen("home"); }}
        />
      )}
      {screen === "loading" && <LoadingScreen state={state} />}
      {screen === "results" && state.intent && grouped && (
        <ResultsScreen
          intent={state.intent}
          dalleImageUrl={state.dalleImageUrl!}
          grouped={grouped}
          onReset={() => { setSeedQuery(""); setScreen("home"); }}
        />
      )}
    </div>
  );
}
```

**Verify Phase 4:** Run `npx tsc --noEmit`. Should be error-free. Run `npm run dev`. Should start at `http://localhost:5173` with no console errors. Homepage should render with category pills (verify the pill list is the actual articleTypes from the catalog, not a placeholder).

---

## Phase 5 — Verification

Create `verify.sh` at the project root:

```bash
#!/bin/bash
set -e
echo "=== Verifying app build ==="

# 1. TypeScript compiles cleanly
echo "[1/6] TypeScript check..."
npx tsc --noEmit || { echo "FAIL: TypeScript errors"; exit 1; }
echo "OK: TypeScript clean"

# 2. Path aliases configured in all three places
echo "[2/6] Path aliases..."
grep -q '"@/\*"' tsconfig.json || { echo "FAIL: tsconfig.json missing @/* path"; exit 1; }
grep -q '"@/\*"' tsconfig.app.json || { echo "FAIL: tsconfig.app.json missing @/* path"; exit 1; }
grep -q '"@":' vite.config.ts || { echo "FAIL: vite.config.ts missing @ alias"; exit 1; }
echo "OK: path aliases in all three configs"

# 3. No hardcoded category lists in source
echo "[3/6] No hardcoded categories..."
# Check for common offending patterns: arrays of category-like strings outside data/
HARDCODED=$(grep -rn --include="*.ts" --include="*.tsx" \
  -E '\["Tshirts"|"Casual Shoes",|"Topwear",' \
  src/ | grep -v 'src/data/' || true)
if [ -n "$HARDCODED" ]; then
  echo "FAIL: hardcoded categories found:"
  echo "$HARDCODED"
  exit 1
fi
echo "OK: no hardcoded category lists"

# 4. catalog_with_embeddings.json is fetched, not imported
echo "[4/6] Embeddings file is fetched, not imported..."
if grep -rn --include="*.ts" --include="*.tsx" "import.*catalog_with_embeddings" src/ 2>/dev/null; then
  echo "FAIL: catalog_with_embeddings.json is imported (must be fetched)"
  exit 1
fi
grep -rq 'fetch.*catalog_with_embeddings' src/ || { echo "FAIL: no fetch() of catalog_with_embeddings.json"; exit 1; }
echo "OK: embeddings fetched at runtime"

# 5. DALL-E URL is not fetched client-side
echo "[5/6] DALL-E URL handling..."
# Look for any fetch() of a variable that smells like a dalle URL
SUSPICIOUS=$(grep -rn --include="*.ts" --include="*.tsx" \
  -E 'fetch\(.*(dalle|imageUrl|DalleUrl|outfit_image)' \
  src/ || true)
if [ -n "$SUSPICIOUS" ]; then
  echo "FAIL: DALL-E URL appears to be fetched client-side:"
  echo "$SUSPICIOUS"
  exit 1
fi
echo "OK: DALL-E URL passed directly to vision and img"

# 6. Data files in correct locations
echo "[6/6] Data files in place..."
test -f src/data/catalog.json || { echo "FAIL: src/data/catalog.json missing"; exit 1; }
test -f public/data/catalog_with_embeddings.json || { echo "FAIL: public/data/catalog_with_embeddings.json missing"; exit 1; }
IMG_COUNT=$(ls public/images/*.jpg 2>/dev/null | wc -l)
if [ "$IMG_COUNT" -lt 20000 ]; then
  echo "FAIL: only $IMG_COUNT product images, expected >20000"
  exit 1
fi
echo "OK: all data files in place ($IMG_COUNT product images)"

echo "=== ALL CHECKS PASSED ==="
```

Run it:

```bash
chmod +x verify.sh
./verify.sh
```

**If any check fails:** fix the underlying issue and re-run. Do not declare done until all checks pass.

---

## Phase 6 — Smoke test

```bash
npm run dev
```

Open `http://localhost:5173`. Manually verify:

1. Homepage renders with the wordmark, search bar, category pills, and two product rows.
2. Category pills are derived from the actual catalog (you should see things like "Tshirts", "Shirts", "Casual Shoes", "Watches", etc. — not made-up names).
3. Type "a summer wedding in Tuscany" and press Enter → routes to chat screen.
4. Chat: stylist asks about gender → reply "womenswear" → stylist confirms → loading screen appears.
5. Loading: 3 steps tick off. DALL-E image fades in. Total time ~30–45 seconds.
6. Results: header shows "Your looks for a summer wedding in Tuscany". Style inspiration thumbnail on the right. 3-5 product rows grouped by subcategory (e.g. "Dresses", "Heels", "Handbags").
7. "Start over" returns to homepage.

If all of the above works, the build is complete.

---

## Demo prep

For the actual demo to RetailNext's CTO and Head of Innovation:

```bash
npm run build && npm run preview
```

This serves the production bundle, which is faster than dev mode and feels more polished. Open `http://localhost:4173`.
