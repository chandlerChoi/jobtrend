import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/db.js";

const FREE_ALERT_LIMIT = 5;
const PREMIUM_ALERT_LIMIT = 20;

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const user = await requireUser(req);

  if (req.method === "GET") {
    const alerts = await db.listActiveCompanyAlerts(user.id);
    res.status(200).json({ alerts });
    return;
  }

  if (req.method === "POST") {
    const { companyName, channel } = req.body ?? {};
    if (!companyName) {
      res.status(400).json({ error: "companyName required" });
      return;
    }

    const activeCount = await db.countActiveCompanyAlerts(user.id);
    const limit = user.plan_tier === "premium" ? PREMIUM_ALERT_LIMIT : FREE_ALERT_LIMIT;
    if (activeCount >= limit) {
      res.status(403).json({ reason: "FREE_LIMIT_EXCEEDED", limit });
      return;
    }

    const alert = await db.createCompanyAlert({
      user_id: user.id,
      company_name: companyName,
      channel: channel ?? "email",
      active: true
    });
    res.status(201).json({ alert });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
});
