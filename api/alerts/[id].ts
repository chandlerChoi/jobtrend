import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/mockDb.js";

export default withErrorHandling((req: VercelRequest, res: VercelResponse) => {
  const user = requireUser(req);
  const id = String(req.query.id);

  if (req.method !== "DELETE") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const alert = db.keywordAlerts.find((a) => a.id === id && a.user_id === user.id);
  if (!alert) {
    res.status(404).json({ error: "alert_not_found" });
    return;
  }
  alert.active = false;
  res.status(204).end();
});
