import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { generateInterviewQuestions } from "../lib/claude.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const user = await requireUser(req);
  const { jdText, resumeText, jobCategory } = req.body ?? {};

  if (!jdText) {
    res.status(400).json({ error: "jdText required" });
    return;
  }

  if (user.interview_credits <= 0) {
    res.status(402).json({ error: "insufficient_credits", chargeOptions: [{ credits: 5, price: 4900 }, { credits: 10, price: 8900 }] });
    return;
  }

  const questions = await generateInterviewQuestions(jdText, resumeText ?? null);

  const remaining = await db.decrementCredit(user.id);
  if (remaining < 0) {
    res.status(402).json({ error: "insufficient_credits" });
    return;
  }
  await db.recordCreditTransaction(user.id, "consume", -1, remaining);

  const session = {
    id: randomUUID(),
    user_id: user.id,
    job_category: jobCategory ?? null,
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
