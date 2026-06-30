import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { db } from "../lib/db.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const companyName = req.query.company ? String(req.query.company) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  const [news, trend, total] = await Promise.all([
    db.listRecruitmentNews({ companyName, limit }),
    db.recentNewsTrend(7),
    db.countNews()
  ]);

  res.status(200).json({ news, trend, total, lastUpdated: new Date().toISOString() });
});
