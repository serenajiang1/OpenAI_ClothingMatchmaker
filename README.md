# OpenAI Clothing Matchmaker

Two projects live in this repository:

- **`retailnext-embeddings/`** — Node/TypeScript pipeline: download catalog, filter, images, `text-embedding-3-large` (256-dim), write `catalog.json` + `public/data/catalog_with_embeddings.json`. See `retailnext-embeddings/BUILD.md`.
- **`retailnext-stylist/`** — Vite + React demo app (chat → DALL·E → vision → catalog match). See `retailnext-stylist/BUILD.md`.

Operator flow: **`RUNBOOK.md`** (hand-off between projects, env vars, verification).
