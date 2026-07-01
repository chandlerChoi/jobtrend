import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../../server/respond.js";
import { db } from "../../../server/db.js";

type SummaryJson = { requirements: string[]; preferred: string[]; interviewType: string[] };

const MOCK_SUMMARY: SummaryJson = {
  requirements: ["관련 분야 경력 3년 이상", "해당 직무 전공자 우대", "팀 협업 경험 필수"],
  preferred: ["관련 자격증 보유자", "영어 의사소통 가능자"],
  interviewType: ["기술면접", "인성면접"]
};

async function summarizeWithGPT(title: string, company: string): Promise<SummaryJson> {
  if (!process.env.OPENAI_API_KEY) return MOCK_SUMMARY;

  const prompt = `다음 채용공고를 3가지로 요약하세요.
공고: ${company} - ${title}

JSON으로만 응답:
{
  "requirements": ["자격요건 3줄 이내"],
  "preferred": ["우대사항 2줄 이내"],
  "interviewType": ["기술면접" | "인성면접" | "PT면접" 중 해당하는 것]
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!res.ok) return MOCK_SUMMARY;
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(text) as SummaryJson;
  } catch {
    return MOCK_SUMMARY;
  }
}

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const newsId = String(req.query.id);
  const allNews = await db.listRecruitmentNews({ limit: 200 });
  const news = allNews.find((n) => n.id === newsId);

  if (!news) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  // Return cached summary if available
  if ((news as unknown as { ai_summary_json?: SummaryJson | null }).ai_summary_json) {
    res.status(200).json({ summary: (news as unknown as { ai_summary_json: SummaryJson }).ai_summary_json });
    return;
  }

  const summary = await summarizeWithGPT(news.title, news.company_name);
  res.status(200).json({ summary });
});
