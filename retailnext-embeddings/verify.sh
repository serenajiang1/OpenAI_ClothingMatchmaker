#!/bin/bash
set -e
echo "=== Verifying pipeline outputs ==="

# 1. Output files exist
test -f catalog.json || { echo "FAIL: catalog.json missing"; exit 1; }
test -f public/data/catalog_with_embeddings.json || { echo "FAIL: catalog_with_embeddings.json missing"; exit 1; }
test -d public/images || { echo "FAIL: public/images/ missing"; exit 1; }

# 2. Image count is reasonable for this dataset (>500)
IMG_COUNT=$(ls public/images/*.jpg 2>/dev/null | wc -l)
if [ "$IMG_COUNT" -lt 500 ]; then
  echo "FAIL: only $IMG_COUNT images in public/images/, expected >500"
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
