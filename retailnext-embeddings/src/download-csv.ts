import axios from "axios";
import Papa from "papaparse";
import type { RawRow } from "./types.js";

const CSV_URL =
  "https://raw.githubusercontent.com/openai/openai-cookbook/main/examples/data/sample_clothes/sample_styles.csv";

export async function downloadCsv(): Promise<{
  rows: RawRow[];
  parseErrorCount: number;
}> {
  const response = await axios.get<string>(CSV_URL, {
    responseType: "text",
    timeout: 30000,
  });

  const result = Papa.parse<RawRow>(response.data, {
    header: true,
    skipEmptyLines: true,
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });

  const parseErrorCount = result.errors.length;
  console.log(`CSV parse errors (rows skipped by parser): ${parseErrorCount}`);

  return { rows: result.data, parseErrorCount };
}
