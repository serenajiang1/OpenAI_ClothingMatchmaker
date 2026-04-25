# BUILD.md — Catalog Embeddings Pipeline

You are building a standalone Node.js + TypeScript script that prepares a fashion catalog for a downstream React app. It downloads the OpenAI cookbook's sample catalog, filters invalid rows, downloads ~30,000 product images, generates 256-dim embeddings via `text-embedding-3-large`, and emits two JSON files plus the image directory.

Execute every phase below in order. After each phase, verify it succeeded before moving to the next. Do not skip ahead.

---

## ⚠ Non-negotiable invariants

These are also encoded in `.cursor/rules/pipeline-invariants.mdc` and will be auto-injected on every agent turn. Restating here for emphasis:

1. **Never hardcode category lists.** All unique values for articleType, subCategory, gender, season, usage, baseColour must be discovered from filtered data and logged.
2. **Embedding model is `text-embedding-3-large` with `dimensions: 256`** — not the default 3072. The full-dim file is ~1 GB and unfetchable client-side.
3. **Skip 404 images and remove those products from the catalog.** Both output JSON files must contain the same products in the same order.
4. **Image downloads must be resumable** — check disk before downloading.
5. **`catalog.json` has no `embedding` field.** Strip it cleanly when writing.

---

## Phase 1 — Project initialisation

```bash
npm init -y
npm pkg set type=module
npm install openai papaparse axios p-limit dotenv
npm install -D typescript @types/node @types/papaparse tsx
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

Add to `package.json` scripts:

```json
"scripts": {
  "build": "tsx src/index.ts",
  "verify": "bash verify.sh"
}
```

Create `.gitignore`:

```
node_modules
dist
.env
public/images
catalog.json
public/data/*.json
```

**Verify Phase 1:** `package.json`, `tsconfig.json`, `.gitignore` exist. `node_modules/` populated. `.env` already exists with `OPENAI_API_KEY` (the operator created this manually).

---

## Phase 2 — File scaffold

Create empty files (Cursor should write them as empty placeholders, then fill them in Phase 3):

```
src/
├── index.ts
├── download-csv.ts
├── filter.ts
├── download-images.ts
├── embeddings.ts
├── output.ts
├── summary.ts
└── types.ts
```

Also create directories (with `.gitkeep` placeholders):

```
public/images/
public/data/
```

**Verify Phase 2:** The directory tree above exists.

---

## Phase 3 — Implementation

### 3.1 `src/types.ts`

```typescript
export interface RawRow {
  id: string;
  gender: string;
  masterCategory: string;
  subCategory: string;
  articleType: string;
  baseColour: string;
  season: string;
  year: string;
  usage: string;
  productDisplayName: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  articleType: string;
  masterCategory: string;
  subCategory: string;
  gender: string;
  season: string;
  usage: string;
  baseColour: string;
  image: string; // "/images/{id}.jpg"
}

export interface EmbeddedProduct extends CatalogProduct {
  embedding: number[];
}
```

### 3.2 `src/download-csv.ts`

Source URL: `https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/data/sample_clothes/sample_styles.csv`

Use axios to GET the CSV as text. Parse with papaparse:

```typescript
Papa.parse<RawRow>(csvText, {
  header: true,
  skipEmptyLines: true,
  transform: (v) => (typeof v === "string" ? v.trim() : v),
});
```

The cookbook CSV has occasional malformed rows (unescaped commas in `productDisplayName`). Papaparse exposes these in `result.errors`. Log how many errored rows there were, then return `result.data`. Do not try to repair the CSV.

### 3.3 `src/filter.ts`

Apply filters in order, logging the count dropped at each step:

1. `id` non-empty and matches `/^\d+$/`
2. `productDisplayName` non-empty after trim
3. `gender` ∈ `["Men", "Women", "Boys", "Girls", "Unisex"]`
4. `articleType` non-empty
5. Deduplicate by `id` (keep first occurrence)

After filtering, export a function `logUniqueValues(rows: RawRow[])` that prints sorted unique values for: articleType, subCategory, masterCategory, gender, season, usage, baseColour. Format:

```
articleType (47 unique): Tshirts, Shirts, Casual Shoes, ...
```

These logs are critical — the downstream app's UI is derived from these values. They must appear in the build output.

### 3.4 `src/download-images.ts`

Image URL pattern: `https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/data/sample_clothes/sample_images/{id}.jpg`

Use `p-limit` with concurrency 15:

```typescript
import pLimit from "p-limit";
import axios from "axios";
import fs from "fs/promises";
import path from "path";

const limit = pLimit(15);

async function downloadOne(id: string): Promise<boolean> {
  const dest = path.join("./public/images", `${id}.jpg`);
  // Resumability: skip if exists
  try { await fs.access(dest); return true; } catch {}
  try {
    const url = `https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/data/sample_clothes/sample_images/${id}.jpg`;
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      validateStatus: (s) => s < 500,
    });
    if (res.status !== 200) return false;
    await fs.writeFile(dest, Buffer.from(res.data));
    return true;
  } catch {
    return false;
  }
}
```

Log every 100 completed downloads: `Downloaded 1200/30000 images (42 missing so far)`.

Map each successful row to a `CatalogProduct` with `image: "/images/${id}.jpg"`. Return the resulting array plus the count of skipped (404) products.

### 3.5 `src/embeddings.ts`

```typescript
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
  let completed = 0;

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
        completed += batch.length;
        if (idx % 10 === 0) {
          console.log(`Embedded ${completed}/${products.length} products (${totalTokens} tokens)`);
        }
        return batch.map((p, i) => ({ ...p, embedding: out.data[i].embedding }));
      })
    )
  );

  return { embedded: results.flat(), totalTokens };
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let delay = 1000;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const isRetryable = status === 429 || (status >= 500 && status < 600);
      if (!isRetryable || i === attempts - 1) throw err;
      const retryAfter = Number(err?.response?.headers?.["retry-after"]) || delay / 1000;
      console.warn(`Retry ${i + 1}/${attempts} in ${retryAfter}s (status ${status})`);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      delay *= 2;
    }
  }
  throw new Error("withRetry: unreachable");
}
```

### 3.6 `src/output.ts`

```typescript
import fs from "fs/promises";
import type { CatalogProduct, EmbeddedProduct } from "./types.js";

export async function writeOutputs(
  products: CatalogProduct[],
  embedded: EmbeddedProduct[]
) {
  // catalog.json — strip embeddings cleanly
  const catalogClean = products.map(({ ...p }) => p);
  await fs.writeFile("./catalog.json", JSON.stringify(catalogClean, null, 2));

  // catalog_with_embeddings.json — minified to keep size down
  await fs.writeFile(
    "./public/data/catalog_with_embeddings.json",
    JSON.stringify(embedded)
  );
}
```

Important: the order of `products` and `embedded` must be identical. Don't sort one and not the other.

### 3.7 `src/summary.ts`

Print a final summary block. Compute real numbers from the actual data:

```
========================================
 EMBEDDINGS PIPELINE — SUMMARY
========================================
Source rows (raw CSV):           XX,XXX
Parse errors (skipped):             XXX
After filtering:                 XX,XXX
Images downloaded:               XX,XXX
Images missing (404):             X,XXX
Final catalog size:              XX,XXX

Breakdown by gender:
  Men:        XX,XXX
  Women:      XX,XXX
  ...

Breakdown by articleType (top 10):
  Tshirts:           X,XXX
  ...

Embedding model:                 text-embedding-3-large (dim=256)
Total tokens used:               XXX,XXX
Estimated cost (@ $0.13/1M):     $X.XXX

Output files:
  ./catalog.json                            XX.X MB
  ./public/data/catalog_with_embeddings.json   XX.X MB
  ./public/images/                          XX,XXX files
========================================
```

Use `fs.stat` for file sizes. Format bytes as MB with one decimal.

### 3.8 `src/index.ts`

```typescript
import "dotenv/config";
import fs from "fs/promises";
import { downloadCsv } from "./download-csv.js";
import { filterRows, logUniqueValues } from "./filter.js";
import { downloadImages } from "./download-images.js";
import { embedAll } from "./embeddings.js";
import { writeOutputs } from "./output.js";
import { printSummary } from "./summary.js";

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("FATAL: OPENAI_API_KEY missing in .env");
    process.exit(1);
  }
  await fs.mkdir("./public/images", { recursive: true });
  await fs.mkdir("./public/data", { recursive: true });

  console.log("→ Phase 1/5: Downloading CSV...");
  const raw = await downloadCsv();

  console.log(`→ Phase 2/5: Filtering ${raw.length} rows...`);
  const filtered = filterRows(raw);
  logUniqueValues(filtered);

  console.log(`→ Phase 3/5: Downloading ${filtered.length} images (concurrency=15)...`);
  const { products, missingCount } = await downloadImages(filtered);

  console.log(`→ Phase 4/5: Embedding ${products.length} product names...`);
  const { embedded, totalTokens } = await embedAll(products);

  console.log("→ Phase 5/5: Writing output files...");
  await writeOutputs(products, embedded);

  await printSummary({ raw, filtered, products, embedded, missingCount, totalTokens });
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
```

**Verify Phase 3:** Every file above is filled in. No empty stubs remain. `tsx src/index.ts` would type-check cleanly (don't run it yet — that's Phase 4).

---

## Phase 4 — Run the pipeline

```bash
npm run build
```

Expected wall time: 30–60 minutes (image downloads dominate).

If interrupted, just re-run — image downloads are resumable. Embeddings always re-run (they're cheap).

**Verify Phase 4:** All five phases printed completion. The summary block printed real numbers. No FATAL.

---

## Phase 5 — Verification

Create `verify.sh` at the project root:

```bash
#!/bin/bash
set -e
echo "=== Verifying pipeline outputs ==="

# 1. Output files exist
test -f catalog.json || { echo "FAIL: catalog.json missing"; exit 1; }
test -f public/data/catalog_with_embeddings.json || { echo "FAIL: catalog_with_embeddings.json missing"; exit 1; }
test -d public/images || { echo "FAIL: public/images/ missing"; exit 1; }

# 2. Image count is reasonable (>20k)
IMG_COUNT=$(ls public/images/*.jpg 2>/dev/null | wc -l)
if [ "$IMG_COUNT" -lt 20000 ]; then
  echo "FAIL: only $IMG_COUNT images in public/images/, expected >20000"
  exit 1
fi
echo "OK: $IMG_COUNT product images"

# 3. catalog.json has no embedding field
if node -e "
  const c = JSON.parse(require('fs').readFileSync('catalog.json', 'utf8'));
  if (c.length === 0) { console.error('FAIL: catalog.json is empty'); process.exit(1); }
  if ('embedding' in c[0]) { console.error('FAIL: catalog.json contains embeddings'); process.exit(1); }
  console.log('OK: catalog.json has', c.length, 'products, no embeddings');
"; then :; else exit 1; fi

# 4. catalog_with_embeddings.json has 256-dim embeddings
if node -e "
  const c = JSON.parse(require('fs').readFileSync('public/data/catalog_with_embeddings.json', 'utf8'));
  if (c.length === 0) { console.error('FAIL: embeddings file empty'); process.exit(1); }
  if (!Array.isArray(c[0].embedding)) { console.error('FAIL: no embedding array'); process.exit(1); }
  if (c[0].embedding.length !== 256) { console.error('FAIL: embedding is', c[0].embedding.length, 'dim, expected 256'); process.exit(1); }
  console.log('OK: embeddings file has', c.length, 'products with 256-dim embeddings');
"; then :; else exit 1; fi

# 5. Both catalog files have the same product count and order
if node -e "
  const a = JSON.parse(require('fs').readFileSync('catalog.json', 'utf8'));
  const b = JSON.parse(require('fs').readFileSync('public/data/catalog_with_embeddings.json', 'utf8'));
  if (a.length !== b.length) { console.error('FAIL: catalog lengths differ:', a.length, 'vs', b.length); process.exit(1); }
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) { console.error('FAIL: order mismatch at index', i); process.exit(1); }
  }
  console.log('OK: both catalog files match in length and order');
"; then :; else exit 1; fi

echo "=== ALL CHECKS PASSED ==="
```

Run it:

```bash
chmod +x verify.sh
./verify.sh
```

**If any check fails:** fix the underlying issue, re-run `npm run build` to regenerate the affected output, then re-run `./verify.sh`. Do not declare done until all checks pass.

---

## Hand-off to project 2

After all phases pass, the operator (a human) will copy these into the React app project:

- `catalog.json` → `retailnext-stylist/_handoff_catalog.json`
- `public/` (entire dir) → `retailnext-stylist/_handoff_public/`

You don't need to do this — the operator handles it before running the project 2 build.
