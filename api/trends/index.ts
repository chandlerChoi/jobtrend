import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { db } from "../../server/db.js";

async function generateInsight(
  total: number,
  trend: { date: string; count: number }[],
  industry: string | undefined
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const recentSum = trend.slice(-7).reduce((s, d) => s + d.count, 0);
  const prevSum = trend.slice(0, 7).reduce((s, d) => s + d.count, 0);
  const delta = prevSum > 0 ? Math.round(((recentSum - prevSum) / prevSum) * 100) : 0;

  const prompt = [
    `최근 7일 채용 데이터:`,
    `- 필터: ${industry ?? "전체 업종"}`,
    `- 최근 7일 공채 수: ${recentSum}건`,
    `- 전주 대비: ${delta > 0 ? "+" : ""}${delta}%`,
    `- 누적 수집: ${total}건`,
    "",
    "구직자를 위해 3문장으로 해석하세요.",
    "1문장: 수치 기반 사실 / 2문장: 트렌드 해석 / 3문장: 구직자 액션 제안",
    "각 문장은 50자 이내로 작성하세요."
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) return null;
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const industry = req.query.industry ? String(req.query.industry) : undefined;
  const size = req.query.size ? String(req.query.size) : undefined;
  const keyword = req.query.keyword ? String(req.query.keyword) : undefined;
  const employmentType = req.query.employmentType ? String(req.query.employmentType) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  const [news, trend, total] = await Promise.all([
    db.listRecruitmentNews({ limit, industry, size, keyword, employmentType }),
    db.recentNewsTrend(7),
    db.countNews()
  ]);

  // Return cached insight quickly, generate async in background
  const filterKey = `industry=${industry ?? "all"}`;
  let insight: string | null = null;
  let insightCachedAt: string | null = null;

  try {
    const cached = await (db as { getTrendInsight?: (k: string) => Promise<{ text: string; generated_at: string } | null> })
      .getTrendInsight?.(filterKey) ?? null;

    if (cached) {
      insight = cached.text;
      insightCachedAt = cached.generated_at;
      // Refresh if older than 6 hours
      const age = Date.now() - new Date(cached.generated_at).getTime();
      if (age > 6 * 60 * 60 * 1000) {
        generateInsight(total, trend, industry).then((text) => {
          if (text) (db as { upsertTrendInsight?: (k: string, t: string) => Promise<void> }).upsertTrendInsight?.(filterKey, text);
        }).catch(() => {});
      }
    } else {
      insight = await generateInsight(total, trend, industry);
      if (insight) {
        await (db as { upsertTrendInsight?: (k: string, t: string) => Promise<void> }).upsertTrendInsight?.(filterKey, insight);
        insightCachedAt = new Date().toISOString();
      }
    }
  } catch {
    // insight stays null — UI shows fallback message
  }

  res.status(200).json({ news, trend, total, insight, insightCachedAt, lastUpdated: new Date().toISOString() });
});
