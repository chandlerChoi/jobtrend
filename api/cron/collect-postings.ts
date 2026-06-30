// Primary source is now 고용24(워크넷) Open API — 사람인/잡코리아 approval
// wasn't viable before the demo deadline, see api/lib/normalizers.ts. When
// WORK24_API_KEY is set this fetches real postings; otherwise it just
// re-aggregates job_category_stats off the seeded mock postings, which is
// the same step the real pipeline needs after insert either way.
import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling, requireCronSecret } from "../lib/respond.js";
import { db } from "../lib/mockDb.js";
import { fetchWork24Jobs } from "../lib/normalizers.js";
import { WORK24_JOB_CODES } from "../lib/categoryMap.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  requireCronSecret(req);

  let inserted = 0;
  if (process.env.WORK24_API_KEY) {
    for (const [jobCategory, jobsCd] of Object.entries(WORK24_JOB_CODES)) {
      const postings = await fetchWork24Jobs(jobsCd);
      for (const posting of postings) {
        const exists = db.jobPostings.some(
          (p) => p.source === posting.source && p.external_id === posting.external_id
        );
        if (exists) continue;
        db.jobPostings.push({ id: randomUUID(), collected_at: new Date().toISOString(), ...posting, job_category: jobCategory });
        inserted++;
      }
    }
  }

  db.recomputeStatsForToday();
  res.status(200).json({ ok: true, inserted, totalPostings: db.jobPostings.length });
});
