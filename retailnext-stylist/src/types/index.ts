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
