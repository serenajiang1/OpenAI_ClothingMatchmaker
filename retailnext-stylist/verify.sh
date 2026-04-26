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
echo "[6/11] Data files in place..."
test -f src/data/catalog.json || { echo "FAIL: src/data/catalog.json missing"; exit 1; }
test -f public/data/catalog_with_embeddings.json || { echo "FAIL: public/data/catalog_with_embeddings.json missing"; exit 1; }
IMG_COUNT=$(ls public/images/*.jpg 2>/dev/null | wc -l)
CATALOG_COUNT=$(node -e "const c=require('./src/data/catalog.json'); process.stdout.write(String(c.length));")
if [ "$IMG_COUNT" -lt "$CATALOG_COUNT" ]; then
  echo "FAIL: only $IMG_COUNT product images, expected at least $CATALOG_COUNT"
  exit 1
fi
echo "OK: all data files in place ($IMG_COUNT product images, catalog has $CATALOG_COUNT)"

# 7. New lib files exist
echo "[7/11] Free gift, pricing, cart libs..."
test -f src/lib/free-gift.ts || { echo "FAIL: src/lib/free-gift.ts missing"; exit 1; }
test -f src/lib/pricing.ts || { echo "FAIL: src/lib/pricing.ts missing"; exit 1; }
test -f src/lib/cart.ts || { echo "FAIL: src/lib/cart.ts missing"; exit 1; }
echo "OK: required lib files present"

# 8. No hardcoded prices in components
echo "[8/11] No hardcoded prices in components..."
PRICE_LITERALS=$(grep -rn --include="*.tsx" --include="*.ts" -E '\$[0-9]+\.[0-9]{2}' src/components || true)
if [ -n "$PRICE_LITERALS" ]; then
  echo "FAIL: hardcoded price literals found in components:"
  echo "$PRICE_LITERALS"
  exit 1
fi
echo "OK: no hardcoded price literals in components"

# 9. Fallback product id usage only in free-gift.ts
echo "[9/11] Fallback product id scoped correctly..."
ID_MATCHES=$(grep -rn --include="*.ts" --include="*.tsx" '53619' src || true)
if [ -n "$ID_MATCHES" ]; then
  NON_FREE_GIFT=$(echo "$ID_MATCHES" | grep -v 'src/lib/free-gift.ts' || true)
  if [ -n "$NON_FREE_GIFT" ]; then
    echo "FAIL: 53619 appears outside src/lib/free-gift.ts:"
    echo "$NON_FREE_GIFT"
    exit 1
  fi
fi
echo "OK: fallback id appears only where expected"

# 10. Homepage excludes Free Items in rows
echo "[10/11] Homepage free-item filtering..."
grep -q 'Free Items' src/components/HomeScreen.tsx || { echo "FAIL: HomeScreen missing Free Items filtering"; exit 1; }
echo "OK: HomeScreen includes Free Items filtering logic"

# 11. Cart screen exists
echo "[11/11] Cart screen exists..."
test -f src/components/CartScreen.tsx || { echo "FAIL: src/components/CartScreen.tsx missing"; exit 1; }
echo "OK: cart screen exists"

echo "=== ALL CHECKS PASSED ==="
