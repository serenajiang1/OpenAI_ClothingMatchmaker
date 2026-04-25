# RUNBOOK — RetailNext AI Stylist Demo

This is the operator's guide. Two Cursor projects, run in sequence, with a manual data hand-off in between.

**Total time:** ~60–90 minutes (most of it is image downloads in step 3).

---

## Prerequisites

- Node.js 20+ installed
- An OpenAI API key with access to `gpt-4o-mini`, `dall-e-3`, and `text-embedding-3-large`
- Cursor installed, in Agent mode
- ~2 GB free disk space (the catalog images are sizeable)

---

## Step 1 — Lay out the two projects

In a terminal, somewhere convenient (e.g. `~/projects/`):

```bash
mkdir retailnext-embeddings retailnext-stylist
```

Copy the contents of this package into the two folders so you end up with:

```
retailnext-embeddings/
├── .cursor/rules/pipeline-invariants.mdc
└── BUILD.md

retailnext-stylist/
├── .cursor/rules/path-aliases.mdc
├── .cursor/rules/no-hardcoded-categories.mdc
├── .cursor/rules/embeddings-handling.mdc
├── .cursor/rules/dalle-url-handling.mdc
├── BUILD.md
└── setup.sh
```

Both folders should otherwise be empty.

---

## Step 2 — Add your API key

In `retailnext-embeddings/`, create `.env`:

```
OPENAI_API_KEY=sk-...
```

In `retailnext-stylist/`, create `.env`:

```
VITE_OPENAI_API_KEY=sk-...
```

Same key, two different variable names (one is for Node, one for Vite).

---

## Step 3 — Run the embeddings pipeline (project 1)

Open `retailnext-embeddings/` in Cursor. Open the Agent panel (Cmd+I or Cmd+L → Agent tab).

Paste exactly this:

> Read `BUILD.md` and execute every phase in order. Do not skip ahead. After each phase, verify it succeeded before moving on. The final phase runs `verify.sh` — if it fails, fix the issues and re-run it before declaring done.

Wait. The CSV download is fast (~5 sec). Filtering is instant. **Image download takes 30–45 minutes** depending on your connection (it pulls ~30,000 images from GitHub raw with concurrency 15). Embedding generation takes ~3–5 minutes after that.

You should see progress logs like `Downloaded 1200/30000 images (42 missing so far)` and `Embedded 1500/30000 products (84210 tokens)`.

When the agent declares done, you should have:

- `retailnext-embeddings/catalog.json` (~10–15 MB)
- `retailnext-embeddings/public/data/catalog_with_embeddings.json` (~80–100 MB)
- `retailnext-embeddings/public/images/` (~30,000 .jpg files)

If verify.sh failed and the agent couldn't recover, check the [Troubleshooting](#troubleshooting) section.

---

## Step 4 — Hand off data to project 2

In your terminal, from the parent directory containing both projects:

```bash
cp retailnext-embeddings/catalog.json retailnext-stylist/_handoff_catalog.json
cp -r retailnext-embeddings/public retailnext-stylist/_handoff_public
```

The `_handoff_` prefix is intentional — the project 2 build plan will move these into their final locations. Putting them at the project root first means the agent can verify they exist before kicking off the Vite scaffold (which would otherwise overwrite `public/`).

---

## Step 5 — Run the app build (project 2)

Open `retailnext-stylist/` in Cursor. Open the Agent panel.

Paste exactly this:

> Read `BUILD.md` and execute every phase in order. The data hand-off files `_handoff_catalog.json` and `_handoff_public/` are already in place at the project root. Do not skip ahead. After each phase, verify it succeeded before moving on. The final phase runs `verify.sh` — if it fails, fix the issues and re-run it before declaring done.

Build time: ~5–10 minutes. The agent will:

1. Create the four `.cursor/rules/*.mdc` files (already there from your setup, agent will verify)
2. Run `setup.sh` to scaffold Vite + Tailwind + shadcn + the empty stub tree
3. Move the hand-off data into `src/data/` and `public/`
4. Configure path aliases (the most common silent-failure point — rules guard this)
5. Fill in all the source files
6. Run `verify.sh`

When done, run yourself:

```bash
cd retailnext-stylist
npm run dev
```

Open `http://localhost:5173`. Type "a summer wedding in Tuscany" in the search bar and run through the demo flow.

For the actual demo to the CTO, run `npm run build && npm run preview` instead — production bundle is faster and feels more polished.

---

## Troubleshooting

### Step 3: image downloads stalling

GitHub raw rate-limits aggressively. If downloads slow to a crawl, the script is resumable — just re-run it. Already-downloaded images are skipped via filesystem check.

### Step 3: embedding API 429s

The script has retry-with-backoff built in. If it gives up, it's because your org is on Tier 1 with low rate limits. Either wait an hour and re-run, or in `src/embeddings.ts` lower `CONCURRENCY` from 5 to 2.

### Step 5: `Cannot find module '@/components/ui/button'`

Path aliases are misconfigured. The `path-aliases.mdc` rule should have caught this, but if it slipped through: check that `tsconfig.json`, `tsconfig.app.json`, AND `vite.config.ts` all have the alias. Missing any one will silently break shadcn imports.

### Step 5: blank screen, console says embeddings 404

The hand-off `cp` in step 4 didn't land correctly. From `retailnext-stylist/`, run:

```bash
ls public/data/catalog_with_embeddings.json   # should exist, ~80–100 MB
ls public/images/ | wc -l                     # should be ~30,000
```

If either is missing, redo step 4.

### Step 5: DALL-E call hangs for 30+ seconds

This is normal. DALL-E 3 is slow. The loading screen is designed for it.

### Step 5: vision returns empty items array

Usually a transient model issue — re-run the demo. If persistent, check that the DALL-E URL is being passed directly (not fetched and re-encoded). The `dalle-url-handling.mdc` rule guards this; verify it's present in `.cursor/rules/`.

---

## File manifest

```
RUNBOOK.md                                            (this file)

retailnext-embeddings/
├── BUILD.md                                          (Cursor reads this)
└── .cursor/rules/
    └── pipeline-invariants.mdc                       (auto-injected to agent)

retailnext-stylist/
├── BUILD.md                                          (Cursor reads this)
├── setup.sh                                          (Cursor runs this in Phase 1)
└── .cursor/rules/
    ├── path-aliases.mdc                              (auto-injected for tsconfig/vite.config)
    ├── no-hardcoded-categories.mdc                   (auto-injected for .tsx and prompts.ts)
    ├── embeddings-handling.mdc                       (auto-injected for src/lib/**)
    └── dalle-url-handling.mdc                        (auto-injected for pipeline.ts)
```

10 files total.
