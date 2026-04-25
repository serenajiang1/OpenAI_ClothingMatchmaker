import axios from "axios";
import fs from "fs/promises";
import path from "path";
import pLimit from "p-limit";
import type { CatalogProduct, RawRow } from "./types.js";

const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/data/sample_clothes/sample_images";
const IMAGE_DIR = "./public/images";
const limit = pLimit(15);

async function downloadOne(id: string): Promise<boolean> {
  const dest = path.join(IMAGE_DIR, `${id}.jpg`);

  // Resumability: skip download if file already exists.
  try {
    await fs.access(dest);
    return true;
  } catch {
    // continue
  }

  try {
    const url = `${IMAGE_BASE_URL}/${id}.jpg`;
    const res = await axios.get<ArrayBuffer>(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      validateStatus: (s) => s < 500,
    });

    if (res.status !== 200) {
      return false;
    }

    await fs.writeFile(dest, Buffer.from(res.data));
    return true;
  } catch {
    return false;
  }
}

export async function downloadImages(
  rows: RawRow[]
): Promise<{ products: CatalogProduct[]; missingCount: number }> {
  let completed = 0;
  let missingCount = 0;
  const products: CatalogProduct[] = new Array(rows.length);

  await Promise.all(
    rows.map((row, idx) =>
      limit(async () => {
        const ok = await downloadOne(row.id);
        if (!ok) {
          missingCount += 1;
        } else {
          products[idx] = {
            id: row.id,
            name: row.productDisplayName,
            articleType: row.articleType,
            masterCategory: row.masterCategory,
            subCategory: row.subCategory,
            gender: row.gender,
            season: row.season,
            usage: row.usage,
            baseColour: row.baseColour,
            image: `/images/${row.id}.jpg`,
          };
        }

        completed += 1;
        if (completed % 100 === 0 || completed === rows.length) {
          console.log(`Downloaded ${completed}/${rows.length} images (${missingCount} missing so far)`);
        }
      })
    )
  );

  return {
    products: products.filter((p): p is CatalogProduct => Boolean(p)),
    missingCount,
  };
}
