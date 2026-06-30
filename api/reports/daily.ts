import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/db.js";
import type { DailyReportContent } from "../../shared/types.js";

const SPIKE_THRESHOLD_PCT = 20;

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const user = await requireUser(req);
  const dateStr = String(req.query.date ?? new Date().toISOString().slice(0, 10));

  const yesterday = new Date(dateStr);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const alerts = await db.listActiveAlerts(user.id);

  const highlights: DailyReportContent["highlights"] = [];
  for (const alert of alerts) {
    const today = await db.getStatFrequency(alert.keyword, alert.job_category, dateStr);
    const yday = await db.getStatFrequency(alert.keyword, alert.job_category, yesterdayStr);
    if (yday === 0) continue;
    const deltaPct = Math.round(((today - yday) / yday) * 1000) / 10;
    if (Math.abs(deltaPct) >= SPIKE_THRESHOLD_PCT) {
      highlights.push({
        keyword: alert.keyword,
        changeType: deltaPct > 0 ? "frequency_spike" : "frequency_drop",
        delta: `${deltaPct > 0 ? "+" : ""}${deltaPct}%`
      });
    }
  }

  const postingsToday = await db.getPostingsByDate(dateStr);
  const newPostings = postingsToday
    .filter((p) => alerts.some((a) => p.keywords.includes(a.keyword) || p.job_category === a.job_category))
    .slice(0, 10)
    .map((p) => ({ title: p.title, company: p.company, postingUrl: p.posting_url }));

  const content: DailyReportContent = { date: dateStr, highlights, newPostings };
  await db.upsertDailyReport(user.id, dateStr, content);

  res.status(200).json(content);
});
