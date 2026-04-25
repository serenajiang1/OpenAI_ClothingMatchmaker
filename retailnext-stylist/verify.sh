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
CATALOG_COUNT=$(node -e "const c=require('./src/data/catalog.json'); process.stdout.write(String(c.length));")
if [ "$IMG_COUNT" -lt "$CATALOG_COUNT" ]; then
  echo "FAIL: only $IMG_COUNT product images, expected at least $CATALOG_COUNT"
  exit 1
fi
echo "OK: all data files in place ($IMG_COUNT product images, catalog has $CATALOG_COUNT)"

echo "=== ALL CHECKS PASSED ==="
