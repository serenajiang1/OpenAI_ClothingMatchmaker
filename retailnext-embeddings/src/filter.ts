import type { RawRow } from "./types.js";

const ALLOWED_GENDERS = new Set(["Men", "Women", "Boys", "Girls", "Unisex"]);

export function filterRows(rows: RawRow[]): RawRow[] {
  let working = rows;

  const beforeId = working.length;
  working = working.filter((r) => /^\d+$/.test((r.id ?? "").trim()));
  console.log(`Filter 1 (valid numeric id): dropped ${beforeId - working.length}`);

  const beforeName = working.length;
  working = working.filter((r) => (r.productDisplayName ?? "").trim().length > 0);
  console.log(`Filter 2 (non-empty productDisplayName): dropped ${beforeName - working.length}`);

  const beforeGender = working.length;
  working = working.filter((r) => ALLOWED_GENDERS.has((r.gender ?? "").trim()));
  console.log(`Filter 3 (allowed gender): dropped ${beforeGender - working.length}`);

  const beforeArticleType = working.length;
  working = working.filter((r) => (r.articleType ?? "").trim().length > 0);
  console.log(`Filter 4 (non-empty articleType): dropped ${beforeArticleType - working.length}`);

  const beforeDedupe = working.length;
  const seen = new Set<string>();
  working = working.filter((r) => {
    const id = r.id.trim();
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
  console.log(`Filter 5 (dedupe by id, keep first): dropped ${beforeDedupe - working.length}`);

  return working;
}

export function logUniqueValues(rows: RawRow[]): void {
  const print = (label: string, accessor: (row: RawRow) => string): void => {
    const unique = Array.from(new Set(rows.map((row) => accessor(row).trim()).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b)
    );
    console.log(`${label} (${unique.length} unique): ${unique.join(", ")}`);
  };

  print("articleType", (r) => r.articleType);
  print("subCategory", (r) => r.subCategory);
  print("masterCategory", (r) => r.masterCategory);
  print("gender", (r) => r.gender);
  print("season", (r) => r.season);
  print("usage", (r) => r.usage);
  print("baseColour", (r) => r.baseColour);
}
