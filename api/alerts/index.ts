import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/db.js";

const FREE_ALERT_LIMIT = 5;
const PREMIUM_ALERT_LIMIT = 20;

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const user = await requireUser(req);

  if (req.method === "GET") {
    const alerts = await db.listActiveAlerts(user.id);
    res.status(200).json({ alerts });
    return;
  }

  if (req.method === "POST") {
    const { keyword, jobCategory, region, channel } = req.body ?? {};
    if (!keyword) {
      res.status(400).json({ error: "keyword required" });
      return;
    }

    const activeCount = await db.countActiveAlerts(user.id);
    const limit = user.plan_tier === "premium" ? PREMIUM_ALERT_LIMIT : FREE_ALERT_LIMIT;
    if (activeCount >= limit) {
      res.status(403).json({ reason: "FREE_LIMIT_EXCEEDED", limit });
      return;
    }

    const alert = await db.createAlert({
      user_id: user.id,
      keyword,
      job_category: jobCategory ?? null,
      region: region ?? null,
      channel: channel ?? "email",
      active: true
    });
    res.status(201).json({ alert });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
});
