import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../lib/respond.js";
import { requireUser } from "../lib/auth.js";
import { db } from "../lib/db.js";
import { evaluateAnswer } from "../lib/claude.js";

function scoreFor(answerText: string): number {
  return Math.min(95, 40 + Math.floor(answerText.trim().length / 4));
}

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const user = await requireUser(req);
  const { sessionId, questionId, answerText } = req.body ?? {};

  const session = await db.getInterviewSession(sessionId, user.id);
  if (!session) {
    res.status(404).json({ error: "session_not_found" });
    return;
  }

  const question = session.questions_json.find((q) => q.id === questionId);
  if (!question) {
    res.status(400).json({ error: "invalid_question_id" });
    return;
  }

  const feedback = await evaluateAnswer(question.text, answerText ?? "");
  const score = scoreFor(answerText ?? "");

  session.answers_json.push({ questionId, answerText, score, feedback });

  const nextQuestion = session.questions_json.find((q) => q.order === question.order + 1);
  session.status = nextQuestion ? "answering" : "completed";

  await db.updateInterviewSession(session);

  res.status(200).json({ feedback, nextQuestionId: nextQuestion?.id ?? null });
});
