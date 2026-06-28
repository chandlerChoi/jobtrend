import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { db } from "../lib/mockDb.js";
import { computeAllSimilarities } from "../lib/similarity.js";
import { CATEGORIES } from "../../shared/categories.js";

export default withErrorHandling((req: VercelRequest, res: VercelResponse) => {
  const jobCategory = decodeURIComponent(String(req.query.jobCategory ?? ""));
  if (!CATEGORIES.some((c) => c.name === jobCategory)) {
    res.status(400).json({ error: "invalid_job_category" });
    return;
  }

  if (db.jobSimilarity.length === 0) computeAllSimilarities();

  const recommendations = db.jobSimilarity
    .filter((s) => s.job_category_a === jobCategory)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 5)
    .map((s) => ({
      jobCategory: s.job_category_b,
      similarityScore: s.similarity_score,
      sharedKeywords: s.shared_keywords
    }));

  res.status(200).json({ sourceJob: jobCategory, recommendations });
});
