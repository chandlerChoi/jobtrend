import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { db } from "../lib/mockDb.js";
import { bucketCareerLevel } from "../lib/keywordExtractor.js";
import { CATEGORIES } from "../../shared/categories.js";

function countBy(items: string[]): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
}

function withPct<T extends { count: number }>(rows: T[], total: number) {
  return rows.map((r) => ({ ...r, pct: total === 0 ? 0 : Math.round((r.count / total) * 1000) / 10 }));
}

export default withErrorHandling((req: VercelRequest, res: VercelResponse) => {
  const jobCategory = decodeURIComponent(String(req.query.jobCategory ?? ""));
  const period = String(req.query.period ?? "30d");
  const days = period.endsWith("d") ? Number(period.slice(0, -1)) || 30 : 30;

  if (!CATEGORIES.some((c) => c.name === jobCategory)) {
    res.status(400).json({ error: "invalid_job_category" });
    return;
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const postings = db.jobPostings.filter((p) => p.job_category === jobCategory && p.posted_at >= sinceStr);

  if (postings.length === 0) {
    res.status(404).json({ error: "no_data_collected", jobCategory });
    return;
  }

  const experienceLevels = postings.map((p) => bucketCareerLevel(p.experience_min, p.experience_max));
  const educationLevels = postings.map((p) => p.education_level ?? "무관");

  const keywordCounts = new Map<string, number>();
  for (const p of postings) {
    for (const k of p.keywords) keywordCounts.set(k, (keywordCounts.get(k) ?? 0) + 1);
  }
  const topKeywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([keyword, frequency]) => ({
      keyword,
      frequency,
      pct: Math.round((frequency / postings.length) * 1000) / 10
    }));

  const trendMap = new Map<string, number>();
  for (const p of postings) trendMap.set(p.posted_at, (trendMap.get(p.posted_at) ?? 0) + 1);
  const postingTrend = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: trendMap.get(key) ?? 0 };
  });

  res.status(200).json({
    jobCategory,
    totalPostings: postings.length,
    experienceDistribution: withPct(countBy(experienceLevels), postings.length).map((r) => ({
      range: r.label,
      count: r.count,
      pct: r.pct
    })),
    educationDistribution: withPct(countBy(educationLevels), postings.length).map((r) => ({
      level: r.label,
      count: r.count,
      pct: r.pct
    })),
    topKeywords,
    postingTrend,
    lastUpdated: new Date().toISOString()
  });
});
