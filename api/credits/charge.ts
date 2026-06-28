// TODO: real payment gateway (Toss/Stripe) integration is out of scope for
// the MVP demo; this records the transaction as if payment already succeeded.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";
import { recordCreditTransaction } from "../lib/mockDb.js";

const CREDIT_PACKS: Record<number, number> = { 5: 4900, 10: 8900 };

export default withErrorHandling((req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const user = requireUser(req);
  const { credits } = req.body ?? {};

  if (!CREDIT_PACKS[credits]) {
    res.status(400).json({ error: "invalid_credit_pack", available: CREDIT_PACKS });
    return;
  }

  user.interview_credits += credits;
  recordCreditTransaction(user.id, "charge", credits, user.interview_credits);

  res.status(200).json({ creditsRemaining: user.interview_credits, charged: CREDIT_PACKS[credits] });
});
