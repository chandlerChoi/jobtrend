import { randomUUID } from "crypto";
import { CATEGORIES } from "../../shared/categories.js";
import { db } from "./mockDb.js";
import type { JobCategoryStatRow } from "../../shared/types.js";

function vectorFor(category: string, stats: JobCategoryStatRow[], vocabulary: string[]): number[] {
  const freqByKeyword = new Map(
    stats.filter((s) => s.job_category === category).map((s) => [s.keyword, s.frequency])
  );
  return vocabulary.map((k) => freqByKeyword.get(k) ?? 0);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

// Run weekly via api/cron/compute-similarity.ts. Populates job_similarity for
// every category pair so /api/adjacent-jobs/:jobCategory is a plain lookup.
export function computeAllSimilarities(): void {
  const latestDate = db.jobCategoryStats.reduce(
    (max, s) => (s.period_date > max ? s.period_date : max),
    ""
  );
  const latestStats = db.jobCategoryStats.filter((s) => s.period_date === latestDate);
  const vocabulary = Array.from(new Set(latestStats.map((s) => s.keyword)));

  for (const a of CATEGORIES) {
    const vectorA = vectorFor(a.name, latestStats, vocabulary);
    for (const b of CATEGORIES) {
      if (a.name === b.name) continue;
      const vectorB = vectorFor(b.name, latestStats, vocabulary);
      const similarity = cosineSimilarity(vectorA, vectorB);
      const sharedKeywords = vocabulary
        .filter((k, i) => vectorA[i] > 0 && vectorB[i] > 0)
        .sort((x, y) => {
          const fx = latestStats.find((s) => s.job_category === a.name && s.keyword === x)?.frequency ?? 0;
          const fy = latestStats.find((s) => s.job_category === a.name && s.keyword === y)?.frequency ?? 0;
          return fy - fx;
        })
        .slice(0, 5);

      const existing = db.jobSimilarity.find(
        (s) => s.job_category_a === a.name && s.job_category_b === b.name
      );
      if (existing) {
        existing.similarity_score = similarity;
        existing.shared_keywords = sharedKeywords;
        existing.computed_at = new Date().toISOString();
      } else {
        db.jobSimilarity.push({
          id: randomUUID(),
          job_category_a: a.name,
          job_category_b: b.name,
          similarity_score: similarity,
          shared_keywords: sharedKeywords,
          computed_at: new Date().toISOString()
        });
      }
    }
  }
}
