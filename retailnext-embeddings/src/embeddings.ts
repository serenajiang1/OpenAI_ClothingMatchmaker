import OpenAI from "openai";
import pLimit from "p-limit";
import type { CatalogProduct, EmbeddedProduct } from "./types.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BATCH_SIZE = 100;
const CONCURRENCY = 5;

export async function embedAll(
  products: CatalogProduct[]
): Promise<{ embedded: EmbeddedProduct[]; totalTokens: number }> {
  const batches: CatalogProduct[][] = [];
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    batches.push(products.slice(i, i + BATCH_SIZE));
  }

  const limit = pLimit(CONCURRENCY);
  let totalTokens = 0;
  let completedProducts = 0;

  const results = await Promise.all(
    batches.map((batch, idx) =>
      limit(async () => {
        const inputs = batch.map((p) => p.name);
        const out = await withRetry(() =>
          client.embeddings.create({
            model: "text-embedding-3-large",
            dimensions: 256,
            input: inputs,
          })
        );

        totalTokens += out.usage.total_tokens;
        completedProducts += batch.length;

        const completedBatches = idx + 1;
        if (completedBatches % 10 === 0 || completedBatches === batches.length) {
          console.log(`Embedded ${completedProducts}/${products.length} products (${totalTokens} tokens)`);
        }

        return batch.map((p, i) => ({ ...p, embedding: out.data[i].embedding }));
      })
    )
  );

  return { embedded: results.flat(), totalTokens };
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let delayMs = 1000;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as {
        status?: number;
        response?: { status?: number; headers?: Record<string, string | undefined> };
      };
      const status = e.status ?? e.response?.status;
      const isRetryable = status === 429 || (typeof status === "number" && status >= 500 && status < 600);

      if (!isRetryable || i === attempts - 1) {
        throw err;
      }

      const retryAfterHeader = e.response?.headers?.["retry-after"];
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : delayMs / 1000;
      const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : delayMs;

      console.warn(`Retry ${i + 1}/${attempts} in ${Math.round(waitMs / 1000)}s (status ${status})`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      delayMs *= 2;
    }
  }

  throw new Error("withRetry: unreachable");
}
