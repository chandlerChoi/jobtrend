import { KEYWORD_DICTIONARY } from "../../shared/categories.js";

// Matches free-text 자격요건 (e.g. 잡코리아's gi_duty, which won't arrive as a
// clean comma list like 사람인's `keyword` field) against the known stack
// dictionary. 사람인 jobs can usually skip this and split on commas directly.
export function extractKeywordsFromText(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  const normalized = text.toLowerCase();
  for (const keyword of KEYWORD_DICTIONARY) {
    if (normalized.includes(keyword.toLowerCase())) found.add(keyword);
  }
  return Array.from(found);
}

export function bucketCareerLevel(min: number | null, max: number | null): string {
  if (min === null && max === null) return "경력무관";
  if ((min ?? 0) === 0 && (max ?? 0) === 0) return "신입";
  const years = max ?? min ?? 0;
  if (years <= 3) return "경력 1-3년";
  if (years <= 7) return "경력 4-7년";
  return "경력무관";
}
