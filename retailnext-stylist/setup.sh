#!/bin/bash
# setup.sh — scaffolds the React project. Run from project root.
# Idempotent: safe to re-run (will skip steps already completed).
set -e

echo "=== Phase 1.1: Vite scaffold ==="
if [ ! -f "package.json" ] || ! grep -q '"vite"' package.json 2>/dev/null; then
  # npm create vite needs an empty-ish dir, but we have BUILD.md, .cursor/, .env, _handoff_*
  # Move them aside, scaffold, then put them back.
  mkdir -p .scaffold-tmp
  [ -f BUILD.md ] && mv BUILD.md .scaffold-tmp/
  [ -f setup.sh ] && cp setup.sh .scaffold-tmp/
  [ -f .env ] && mv .env .scaffold-tmp/
  [ -d .cursor ] && mv .cursor .scaffold-tmp/
  [ -f _handoff_catalog.json ] && mv _handoff_catalog.json .scaffold-tmp/
  [ -d _handoff_public ] && mv _handoff_public .scaffold-tmp/

  npm create vite@latest . -- --template react-ts -y
  npm install

  # Restore
  mv .scaffold-tmp/* . 2>/dev/null || true
  mv .scaffold-tmp/.env . 2>/dev/null || true
  mv .scaffold-tmp/.cursor . 2>/dev/null || true
  rmdir .scaffold-tmp
else
  echo "  Vite already scaffolded, skipping"
fi

echo "=== Phase 1.2: Dependencies ==="
npm install openai
npm install -D tailwindcss@3 postcss autoprefixer @types/node
npx tailwindcss init -p 2>/dev/null || echo "  tailwind config already exists"

echo "=== Phase 1.3: Empty stub tree ==="
mkdir -p src/lib src/hooks src/components/ui src/types src/data public/data public/images

# Create empty stubs only if they don't exist yet
for f in \
  src/lib/openai.ts \
  src/lib/prompts.ts \
  src/lib/intent.ts \
  src/lib/similarity.ts \
  src/lib/pipeline.ts \
  src/lib/utils.ts \
  src/hooks/usePipeline.ts \
  src/components/HomeScreen.tsx \
  src/components/ChatScreen.tsx \
  src/components/LoadingScreen.tsx \
  src/components/ResultsScreen.tsx \
  src/components/ProductCard.tsx \
  src/components/ProductRow.tsx \
  src/components/CategoryPills.tsx \
  src/types/index.ts \
; do
  [ -f "$f" ] || touch "$f"
done

echo "=== Phase 1.4: Hand-off data ==="
if [ -f "_handoff_catalog.json" ]; then
  mv _handoff_catalog.json src/data/catalog.json
  echo "  Moved catalog.json into src/data/"
fi
if [ -d "_handoff_public" ]; then
  # Merge: copy contents into public/, overwriting Vite's default favicon etc. is fine
  cp -r _handoff_public/. public/
  rm -rf _handoff_public
  echo "  Merged hand-off public/ into project public/"
fi

# Sanity check the hand-off arrived
if [ ! -f "src/data/catalog.json" ]; then
  echo "WARNING: src/data/catalog.json not found. Did you run the data hand-off cp commands?" >&2
  echo "         See RUNBOOK.md Step 4." >&2
fi
if [ ! -f "public/data/catalog_with_embeddings.json" ]; then
  echo "WARNING: public/data/catalog_with_embeddings.json not found." >&2
fi

echo "=== Setup complete ==="
echo "Next: agent fills in stub files per BUILD.md Phase 3."
