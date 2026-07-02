// POST /api/cover-letter — RAG 기반 자소서 분석·개선
// Body: { coverLetterText, jobPostingText?, followUpAnswers? }
// - followUpAnswers 없이 첫 요청: 섹션 분석 + 꼬리질문 반환
// - followUpAnswers 포함 두 번째 요청: 개선본 포함 반환
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { requireUser } from "../../server/auth.js";
import { analyzeCoverLetter } from "../../server/claude.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  await requireUser(req);

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { coverLetterText, jobPostingText, followUpAnswers } = (req.body ?? {}) as {
    coverLetterText?: string;
    jobPostingText?: string;
    followUpAnswers?: Record<string, string>;
  };

  if (!coverLetterText?.trim()) {
    res.status(400).json({ error: "coverLetterText is required" });
    return;
  }

  const result = await analyzeCoverLetter(
    coverLetterText,
    jobPostingText ?? null,
    followUpAnswers ?? null
  );

  res.status(200).json(result);
});
