import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { db } from "../lib/db.js";
import { computeAllSimilarities } from "../lib/similarity.js";
import { CATEGORIES } from "../../shared/categories.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const jobCategory = decodeURIComponent(String(req.query.jobCategory ?? ""));
  if (!CATEGORIES.some((c) => c.name === jobCategory)) {
    res.status(400).json({ error: "invalid_job_category" });
    return;
  }

  if (!(await db.hasAnySimilarity())) await computeAllSimilarities();

  const recommendations = (await db.getSimilarities(jobCategory)).slice(0, 5).map((s) => ({
    jobCategory: s.job_category_b,
    similarityScore: s.similarity_score,
    sharedKeywords: s.shared_keywords
  }));

  res.status(200).json({ sourceJob: jobCategory, recommendations });
});
