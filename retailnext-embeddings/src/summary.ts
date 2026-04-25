import fs from "fs/promises";
import type { CatalogProduct, EmbeddedProduct, RawRow } from "./types.js";

interface SummaryInput {
  raw: RawRow[];
  parseErrorCount: number;
  filtered: RawRow[];
  products: CatalogProduct[];
  embedded: EmbeddedProduct[];
  missingCount: number;
  totalTokens: number;
}

function fmtInt(value: number): string {
  return value.toLocaleString("en-US");
}

function fmtMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function printSummary(input: SummaryInput): Promise<void> {
  const catalogStat = await fs.stat("./catalog.json");
  const embeddedStat = await fs.stat("./public/data/catalog_with_embeddings.json");
  const imageFiles = (await fs.readdir("./public/images")).filter((f) => f.endsWith(".jpg"));

  const genderCounts = new Map<string, number>();
  const articleTypeCounts = new Map<string, number>();

  for (const product of input.products) {
    genderCounts.set(product.gender, (genderCounts.get(product.gender) ?? 0) + 1);
    articleTypeCounts.set(product.articleType, (articleTypeCounts.get(product.articleType) ?? 0) + 1);
  }

  const topArticleTypes = Array.from(articleTypeCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10);
  const estimatedCost = (input.totalTokens / 1_000_000) * 0.13;

  console.log("========================================");
  console.log(" EMBEDDINGS PIPELINE - SUMMARY");
  console.log("========================================");
  console.log(`Source rows (raw CSV):           ${fmtInt(input.raw.length)}`);
  console.log(`Parse errors (skipped):          ${fmtInt(input.parseErrorCount)}`);
  console.log(`After filtering:                 ${fmtInt(input.filtered.length)}`);
  console.log(`Images downloaded:               ${fmtInt(input.products.length)}`);
  console.log(`Images missing (404):            ${fmtInt(input.missingCount)}`);
  console.log(`Final catalog size:              ${fmtInt(input.embedded.length)}`);
  console.log("");
  console.log("Breakdown by gender:");
  for (const [gender, count] of Array.from(genderCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${gender}: ${fmtInt(count)}`);
  }
  console.log("");
  console.log("Breakdown by articleType (top 10):");
  for (const [articleType, count] of topArticleTypes) {
    console.log(`  ${articleType}: ${fmtInt(count)}`);
  }
  console.log("");
  console.log("Embedding model:                 text-embedding-3-large (dim=256)");
  console.log(`Total tokens used:               ${fmtInt(input.totalTokens)}`);
  console.log(`Estimated cost (@ $0.13/1M):     $${estimatedCost.toFixed(3)}`);
  console.log("");
  console.log("Output files:");
  console.log(`  ./catalog.json                           ${fmtMb(catalogStat.size)}`);
  console.log(`  ./public/data/catalog_with_embeddings.json ${fmtMb(embeddedStat.size)}`);
  console.log(`  ./public/images/                         ${fmtInt(imageFiles.length)} files`);
  console.log("========================================");
}
