export const BANNED_WORDS = [
  "caralho",
  "porra",
  "puta",
  "putaria",
  "bosta",
  "merda",
  "foda",
  "fodase",
  "foda-se",
  "fdp",
  "filho da puta",
  "desgraça",
  "desgraca",
  "arrombado",
  "vai tomar no cu",
  "tomar no cu",
  "cu",
  "Buceta",
  "Boceta",
  "Buça",
  "cuzao",
  "cuzão",
  "xibiu",
];

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collapseRepeatedLetters(text: string): string {
  return text.replace(/([a-z])\1{2,}/g, "$1$1");
}

function applyCommonBypassReplacements(text: string): string {
  return text
    .replace(/0/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b");
}

export function normalizeTextForModeration(text: string): string {
  const lower = text.toLowerCase();
  const noAccents = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const withBypassFixes = applyCommonBypassReplacements(noAccents);
  const collapsedRepeats = collapseRepeatedLetters(withBypassFixes);
  const punctuationAsSpace = collapsedRepeats.replace(/[\n\r\t]+/g, " ").replace(/[._\-–—,;:(){}[\]/\\<>]+/g, " ");
  const cleaned = punctuationAsSpace.replace(/[^a-z0-9 ]+/g, " ");
  return cleaned.replace(/\s+/g, " ").trim();
}

const NORMALIZED_BANNED_WORDS = BANNED_WORDS.map((w) => normalizeTextForModeration(w)).filter(Boolean);
const NORMALIZED_BANNED_WORDS_NO_SPACE = NORMALIZED_BANNED_WORDS.map((w) => w.replace(/\s+/g, ""));
const NORMALIZED_BANNED_PATTERNS = NORMALIZED_BANNED_WORDS.map(
  (w) => new RegExp(`(^|\\s)${escapeRegex(w)}(\\s|$)`, "i"),
);

export function containsBadWords(text: string): boolean {
  const normalized = normalizeTextForModeration(text);
  if (!normalized) return false;

  const collapsed = normalized.replace(/\s+/g, "");

  for (const pattern of NORMALIZED_BANNED_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }

  for (const banned of NORMALIZED_BANNED_WORDS_NO_SPACE) {
    if (!banned) continue;
    if (banned.length < 3) continue;
    if (collapsed.includes(banned)) return true;
  }

  return false;
}

export function validatePreSermonContent(payload: unknown): { valid: boolean; blockedFields: string[] } {
  if (!payload || typeof payload !== "object") return { valid: true, blockedFields: [] };

  const blocked = new Set<string>();

  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (typeof value === "string") {
      if (containsBadWords(value)) blocked.add(key);
      continue;
    }

    if (Array.isArray(value)) {
      const hasBad = value.some((v) => typeof v === "string" && containsBadWords(v));
      if (hasBad) blocked.add(key);
    }
  }

  return { valid: blocked.size === 0, blockedFields: Array.from(blocked) };
}
