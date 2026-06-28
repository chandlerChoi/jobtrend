import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";
import { db, recordCreditTransaction } from "../lib/mockDb.js";
import { generateInterviewQuestions } from "../lib/claude.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const user = requireUser(req);
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

  user.interview_credits -= 1;
  recordCreditTransaction(user.id, "consume", -1, user.interview_credits);

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
  db.interviewSessions.push(session);

  res.status(201).json({ sessionId: session.id, questions, creditsRemaining: user.interview_credits });
});
