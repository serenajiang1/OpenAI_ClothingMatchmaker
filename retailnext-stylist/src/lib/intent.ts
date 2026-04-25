import type { Intent } from "@/types";

// Models sometimes emit |||"INTENT||| or extra spaces; require END marker for a safe strip.
const INTENT_RE =
  /\|\|\|\s*['"]?INTENT\s*\|\|\|\s*([\s\S]*?)\s*\|\|\|\s*END\s*\|\|\|/i;

export function parseIntent(message: string): { visible: string; intent: Intent | null } {
  const match = message.match(INTENT_RE);
  if (!match) return { visible: message.trim(), intent: null };

  const visible = message.replace(INTENT_RE, "").trim();
  try {
    const parsed = JSON.parse(match[1].trim());
    if (
      typeof parsed.occasion === "string" &&
      (parsed.gender === "Women" || parsed.gender === "Men") &&
      ["Summer", "Winter", "Fall", "Spring"].includes(parsed.season)
    ) {
      return { visible, intent: parsed as Intent };
    }
  } catch {}
  return { visible, intent: null };
}
