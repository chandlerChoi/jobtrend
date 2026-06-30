import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { requireUser } from "../../server/auth.js";
import { db } from "../../server/db.js";
import type { DailyDigestContent } from "../../shared/types.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const user = await requireUser(req);
  const dateStr = String(req.query.date ?? new Date().toISOString().slice(0, 10));

  const [alerts, postingsToday] = await Promise.all([
    db.listActiveCompanyAlerts(user.id),
    db.getRecruitmentNewsByDate(dateStr)
  ]);

  const watchedCompanies = new Set(alerts.map((a) => a.company_name));
  const newPostingsByCompany = postingsToday
    .filter((n) => watchedCompanies.has(n.company_name))
    .map((n) => ({ companyName: n.company_name, title: n.title, postingUrl: n.posting_url }));

  const content: DailyDigestContent = { date: dateStr, newPostingsByCompany };
  await db.upsertDailyDigest(user.id, dateStr, content);

  res.status(200).json(content);
});
