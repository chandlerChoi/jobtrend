// Primary source is now 고용24(워크넷) Open API — 사람인/잡코리아 approval
// wasn't viable before the demo deadline, see api/lib/normalizers.ts. When
// WORK24_API_KEY is set this fetches real postings; otherwise it just
// re-aggregates job_category_stats off whatever's already in job_postings
// (the seeded mock data when DATABASE_URL is unset), which is the same
// step the real pipeline needs after insert either way.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling, requireCronSecret } from "../lib/respond.js";
import { db } from "../lib/db.js";
import { fetchWork24Jobs } from "../lib/normalizers.js";
import { WORK24_JOB_CODES } from "../lib/categoryMap.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  requireCronSecret(req);

  let inserted = 0;
  if (process.env.WORK24_API_KEY) {
    for (const [jobCategory, jobsCd] of Object.entries(WORK24_JOB_CODES)) {
      const postings = await fetchWork24Jobs(jobsCd);
      for (const posting of postings) {
        const isNew = await db.insertPostingIfNew({ ...posting, job_category: jobCategory });
        if (isNew) inserted++;
      }
    }
  }

  await db.recomputeStatsForDate(new Date().toISOString().slice(0, 10));
  res.status(200).json({ ok: true, inserted, totalPostings: await db.countPostings() });
});
