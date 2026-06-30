import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { requireUser } from "../../server/auth.js";
import { db } from "../../server/db.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const user = await requireUser(req);
  const id = String(req.query.id);

  if (req.method !== "DELETE") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const removed = await db.deactivateCompanyAlert(id, user.id);
  if (!removed) {
    res.status(404).json({ error: "alert_not_found" });
    return;
  }
  res.status(204).end();
});
