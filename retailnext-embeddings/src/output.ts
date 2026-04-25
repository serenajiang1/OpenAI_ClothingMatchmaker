import fs from "fs/promises";
import type { CatalogProduct, EmbeddedProduct } from "./types.js";

export async function writeOutputs(products: CatalogProduct[], embedded: EmbeddedProduct[]): Promise<void> {
  // catalog.json contains no embeddings.
  const catalogClean = products.map(({ ...p }) => p);
  await fs.writeFile("./catalog.json", JSON.stringify(catalogClean, null, 2));

  // Keep embeddings file minified to reduce transfer size.
  await fs.writeFile("./public/data/catalog_with_embeddings.json", JSON.stringify(embedded));
}
