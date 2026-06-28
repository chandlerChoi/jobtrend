import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/mockDb.js";
import type { DailyReportContent } from "../../shared/types.js";

const SPIKE_THRESHOLD_PCT = 20;

function frequencyFor(keyword: string, jobCategory: string | null, date: string): number {
  return db.jobCategoryStats
    .filter((s) => s.keyword === keyword && s.period_date === date && (!jobCategory || s.job_category === jobCategory))
    .reduce((sum, s) => sum + s.frequency, 0);
}

export default withErrorHandling((req: VercelRequest, res: VercelResponse) => {
  const user = requireUser(req);
  const dateStr = String(req.query.date ?? new Date().toISOString().slice(0, 10));

  const yesterday = new Date(dateStr);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const alerts = db.keywordAlerts.filter((a) => a.user_id === user.id && a.active);

  const highlights: DailyReportContent["highlights"] = [];
  for (const alert of alerts) {
    const today = frequencyFor(alert.keyword, alert.job_category, dateStr);
    const yday = frequencyFor(alert.keyword, alert.job_category, yesterdayStr);
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

  const newPostings = db.jobPostings
    .filter((p) => p.posted_at === dateStr)
    .filter((p) => alerts.some((a) => p.keywords.includes(a.keyword) || p.job_category === a.job_category))
    .slice(0, 10)
    .map((p) => ({ title: p.title, company: p.company, postingUrl: p.posting_url }));

  const content: DailyReportContent = { date: dateStr, highlights, newPostings };

  let report = db.dailyReports.find((r) => r.user_id === user.id && r.report_date === dateStr);
  if (!report) {
    report = {
      id: randomUUID(),
      user_id: user.id,
      report_date: dateStr,
      content_json: content,
      sent_at: null
    };
    db.dailyReports.push(report);
  } else {
    report.content_json = content;
  }

  res.status(200).json(content);
});
