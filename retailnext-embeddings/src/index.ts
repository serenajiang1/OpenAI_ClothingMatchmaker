import "dotenv/config";
import fs from "fs/promises";
import { downloadCsv } from "./download-csv.js";
import { filterRows, logUniqueValues } from "./filter.js";
import { downloadImages } from "./download-images.js";
import { embedAll } from "./embeddings.js";
import { writeOutputs } from "./output.js";
import { printSummary } from "./summary.js";

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    console.error("FATAL: OPENAI_API_KEY missing in .env");
    process.exit(1);
  }

  await fs.mkdir("./public/images", { recursive: true });
  await fs.mkdir("./public/data", { recursive: true });

  console.log("-> Phase 1/5: Downloading CSV...");
  const { rows: raw, parseErrorCount } = await downloadCsv();

  console.log(`-> Phase 2/5: Filtering ${raw.length} rows...`);
  const filtered = filterRows(raw);
  logUniqueValues(filtered);

  console.log(`-> Phase 3/5: Downloading ${filtered.length} images (concurrency=15)...`);
  const { products, missingCount } = await downloadImages(filtered);

  console.log(`-> Phase 4/5: Embedding ${products.length} product names...`);
  const { embedded, totalTokens } = await embedAll(products);

  console.log("-> Phase 5/5: Writing output files...");
  await writeOutputs(products, embedded);

  await printSummary({
    raw,
    parseErrorCount,
    filtered,
    products,
    embedded,
    missingCount,
    totalTokens,
  });
}

main().catch((err: unknown) => {
  console.error("FATAL:", err);
  process.exit(1);
});
