import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { db } from "../../server/db.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const companyName = decodeURIComponent(String(req.query.name ?? ""));
  const [info, news] = await Promise.all([
    db.getCompanyInfo(companyName),
    db.listRecruitmentNews({ companyName, limit: 20 })
  ]);

  if (!info && news.length === 0) {
    res.status(404).json({ error: "company_not_found" });
    return;
  }

  res.status(200).json({ info, news });
});
