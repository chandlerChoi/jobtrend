import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling, requireCronSecret } from "../lib/respond.js";
import { computeAllSimilarities } from "../lib/similarity.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  requireCronSecret(req);
  await computeAllSimilarities();
  res.status(200).json({ ok: true });
});
