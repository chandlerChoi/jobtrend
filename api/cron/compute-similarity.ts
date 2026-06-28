import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling, requireCronSecret } from "../lib/respond.js";
import { computeAllSimilarities } from "../lib/similarity.js";
import { db } from "../lib/mockDb.js";

export default withErrorHandling((req: VercelRequest, res: VercelResponse) => {
  requireCronSecret(req);
  computeAllSimilarities();
  res.status(200).json({ ok: true, pairsComputed: db.jobSimilarity.length });
});
