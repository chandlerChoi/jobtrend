// Ingestion layer (data-in). The service layer (api/news, api/companies,
// api/job-fairs, ...) only ever reads from the DB — it never calls work24
// directly — so this is the only place that touches the external API.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling, requireCronSecret } from "../lib/respond.js";
import { db } from "../lib/db.js";
import { fetchRecruitmentNews, fetchCompanyInfo, fetchJobFairs } from "../lib/normalizers.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  requireCronSecret(req);

  if (!process.env.WORK24_API_KEY) {
    res.status(200).json({ ok: true, skipped: "WORK24_API_KEY not set" });
    return;
  }

  const result = { newsInserted: 0, companiesUpserted: 0, fairsUpserted: 0, errors: [] as string[] };

  try {
    const news = await fetchRecruitmentNews(1, 100);
    for (const item of news) {
      if (await db.insertNewsIfNew(item)) result.newsInserted++;
    }
  } catch (err) {
    result.errors.push(`news: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const companies = await fetchCompanyInfo(1, 100);
    for (const item of companies) {
      await db.upsertCompanyInfo(item);
      result.companiesUpserted++;
    }
  } catch (err) {
    result.errors.push(`companies: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    const fairs = await fetchJobFairs(1, 20);
    for (const fair of fairs) {
      await db.upsertJobFair(fair);
      result.fairsUpserted++;
    }
  } catch (err) {
    result.errors.push(`fairs: ${err instanceof Error ? err.message : String(err)}`);
  }

  res.status(200).json({ ok: true, ...result });
});
