import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";

export default withErrorHandling((req: VercelRequest, res: VercelResponse) => {
  const user = requireUser(req);
  res.status(200).json({ credits: user.interview_credits, planTier: user.plan_tier });
});
