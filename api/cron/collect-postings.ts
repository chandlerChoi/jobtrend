// TODO(api-integration-last): replace the body with real 사람인/잡코리아 fetch +
// normalizeSaraminJob/normalizeJobKoreaJob calls (api/lib/normalizers.ts) once
// approved. Today this just re-aggregates job_category_stats off the seeded
// mock postings, which is the same step the real pipeline needs after insert.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling, requireCronSecret } from "../lib/respond.js";
import { db } from "../lib/mockDb.js";

export default withErrorHandling((req: VercelRequest, res: VercelResponse) => {
  requireCronSecret(req);
  db.recomputeStatsForToday();
  res.status(200).json({ ok: true, totalPostings: db.jobPostings.length });
});
