// TODO: real payment gateway (Toss/Stripe) integration is out of scope for
// the MVP demo; this records the transaction as if payment already succeeded.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { requireUser } from "../../server/auth.js";
import { db } from "../../server/db.js";

const CREDIT_PACKS: Record<number, number> = { 5: 4900, 10: 8900 };

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const user = await requireUser(req);
  const { credits } = req.body ?? {};

  if (!CREDIT_PACKS[credits]) {
    res.status(400).json({ error: "invalid_credit_pack", available: CREDIT_PACKS });
    return;
  }

  const creditsRemaining = await db.addCredits(user.id, credits);
  await db.recordCreditTransaction(user.id, "charge", credits, creditsRemaining);

  res.status(200).json({ creditsRemaining, charged: CREDIT_PACKS[credits] });
});
