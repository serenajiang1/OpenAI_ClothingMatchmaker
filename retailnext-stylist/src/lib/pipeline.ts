import { openai } from "./openai";
import { dallePromptFor, imageAnalysisPrompt, CONVERSATION_SYSTEM_PROMPT } from "./prompts";
import { embedQueries, matchItems, dedupeAndGroup } from "./similarity";
import type { Intent, EmbeddedProduct, AnalyzedImage, ChatMessage } from "@/types";

export async function chatTurn(history: ChatMessage[], userMessage: string): Promise<string> {
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
  return url;
}

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
          { type: "image_url", image_url: { url: imageUrl } },
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

export async function matchAgainstCatalog(
  analyzed: AnalyzedImage,
  intent: Intent,
  catalog: EmbeddedProduct[]
) {
  const itemEmbeddings = await embedQueries(analyzed.items);
  const results = matchItems(analyzed.items, itemEmbeddings, catalog, intent.gender, 3, 0.3);
  return dedupeAndGroup(results);
}

let _catalogCache: EmbeddedProduct[] | null = null;
export async function loadEmbeddedCatalog(): Promise<EmbeddedProduct[]> {
  if (_catalogCache) return _catalogCache;
  const res = await fetch("/data/catalog_with_embeddings.json");
  if (!res.ok) throw new Error(`Failed to load embeddings: ${res.status}`);
  const data = (await res.json()) as EmbeddedProduct[];
  _catalogCache = data;
  return data;
}
