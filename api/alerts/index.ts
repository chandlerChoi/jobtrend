import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/mockDb.js";

const FREE_ALERT_LIMIT = 5;
const PREMIUM_ALERT_LIMIT = 20;

export default withErrorHandling((req: VercelRequest, res: VercelResponse) => {
  const user = requireUser(req);

  if (req.method === "GET") {
    const alerts = db.keywordAlerts.filter((a) => a.user_id === user.id && a.active);
    res.status(200).json({ alerts });
    return;
  }

  if (req.method === "POST") {
    const { keyword, jobCategory, region, channel } = req.body ?? {};
    if (!keyword) {
      res.status(400).json({ error: "keyword required" });
      return;
    }

    const activeCount = db.keywordAlerts.filter((a) => a.user_id === user.id && a.active).length;
    const limit = user.plan_tier === "premium" ? PREMIUM_ALERT_LIMIT : FREE_ALERT_LIMIT;
    if (activeCount >= limit) {
      res.status(403).json({ reason: "FREE_LIMIT_EXCEEDED", limit });
      return;
    }

    const alert = {
      id: randomUUID(),
      user_id: user.id,
      keyword,
      job_category: jobCategory ?? null,
      region: region ?? null,
      channel: channel ?? "email",
      active: true,
      created_at: new Date().toISOString()
    };
    db.keywordAlerts.push(alert);
    res.status(201).json({ alert });
    return;
  }

  res.status(405).json({ error: "method_not_allowed" });
});
