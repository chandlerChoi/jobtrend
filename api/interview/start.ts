import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { requireUser } from "../../server/auth.js";
import { db } from "../../server/db.js";
import { generateInterviewQuestions } from "../../server/claude.js";
import { findStoryHint } from "../../server/storyMining.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const user = await requireUser(req);

  // GET — 이전 면접 세션 목록 반환
  if (req.method === "GET") {
    const sessions = await db.listInterviewSessions(user.id, 30);
    // 각 세션의 평균 점수를 feedback_json에서 읽어 요약만 반환
    const summary = sessions.map((s) => ({
      id: s.id,
      persona_type: s.persona_type ?? "startup",
      jd_text: s.jd_text?.slice(0, 80) ?? "",
      status: s.status,
      created_at: s.created_at,
      averageScore: s.feedback_json?.averageScore ?? null,
      questionCount: s.questions_json?.length ?? 0,
      answeredCount: s.answers_json?.length ?? 0,
    }));
    res.status(200).json({ sessions: summary });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const { jdText, resumeText, persona, industryPersona, stylePersona } = req.body ?? {};
  // Support combined persona: if both industry+style sent, join them; else fall back to legacy single persona field
  const resolvedPersona: string = (() => {
    const parts = [industryPersona, stylePersona].filter(Boolean);
    if (parts.length > 0) return parts.join("|");
    return persona ?? "startup";
  })();

  if (!jdText) {
    res.status(400).json({ error: "jdText required" });
    return;
  }

  if (user.interview_credits <= 0) {
    res.status(402).json({
      error: "insufficient_credits",
      chargeOptions: [{ credits: 5, price: 4900 }, { credits: 10, price: 8900 }]
    });
    return;
  }

  const questions = await generateInterviewQuestions(jdText, resumeText ?? null, 5, resolvedPersona);

  // 스토리뱅크 힌트 첨부
  try {
    const cards = await db.listStoryCards(user.id);
    if (cards.length > 0) {
      for (const q of questions) {
        const hint = findStoryHint(q.text, cards);
        if (hint) q.storyHint = hint;
      }
    }
  } catch {
    // hints are best-effort
  }

  const remaining = await db.decrementCredit(user.id);
  if (remaining < 0) {
    res.status(402).json({ error: "insufficient_credits" });
    return;
  }
  await db.recordCreditTransaction(user.id, "consume", -1, remaining);

  const session = {
    id: randomUUID(),
    user_id: user.id,
    persona_type: resolvedPersona,
    jd_text: jdText,
    resume_text: resumeText ?? null,
    questions_json: questions,
    answers_json: [],
    feedback_json: null,
    status: "questions_generated" as const,
    created_at: new Date().toISOString()
  };
  await db.createInterviewSession(session);

  res.status(201).json({ sessionId: session.id, questions, creditsRemaining: remaining });
});
