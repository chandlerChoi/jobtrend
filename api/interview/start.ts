import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../server/respond.js";
import { requireUser } from "../../server/auth.js";
import { db } from "../../server/db.js";
import { generateInterviewQuestions } from "../../server/claude.js";
import { findStoryHint } from "../../server/storyMining.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const user = await requireUser(req);
  const { jdText, resumeText, persona } = req.body ?? {};

  if (!jdText) {
    res.status(400).json({ error: "jdText required" });
    return;
  }

  if (user.interview_credits <= 0) {
    res.status(402).json({ error: "insufficient_credits", chargeOptions: [{ credits: 5, price: 4900 }, { credits: 10, price: 8900 }] });
    return;
  }

  const questions = await generateInterviewQuestions(jdText, resumeText ?? null, 5, persona ?? "startup");

  // F5 연동 — attach the most relevant story-bank card to each question
  // so the answer box can show a "참고할 스토리" hint. No-op for users
  // with an empty story bank.
  try {
    const cards = await db.listStoryCards(user.id);
    if (cards.length > 0) {
      for (const q of questions) {
        const hint = findStoryHint(q.text, cards);
        if (hint) q.storyHint = hint;
      }
    }
  } catch {
    // hints are best-effort; never block the interview on them
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
    persona_type: persona ?? "startup",
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
