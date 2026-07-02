import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withErrorHandling } from "../../../server/respond.js";
import { requireUser } from "../../../server/auth.js";
import { db } from "../../../server/db.js";

export default withErrorHandling(async (req: VercelRequest, res: VercelResponse) => {
  const user = await requireUser(req);
  const sessionId = String(req.query.sessionId);

  const session = await db.getInterviewSession(sessionId, user.id);
  if (!session) {
    res.status(404).json({ error: "session_not_found" });
    return;
  }

  if (session.answers_json.length === 0) {
    res.status(200).json({
      averageScore: 0, overallStrengths: [], overallImprovements: [],
      history: [], questions: session.questions_json,
      personaType: session.persona_type ?? "startup",
      jdText: session.jd_text
    });
    return;
  }

  const averageScore =
    Math.round((session.answers_json.reduce((sum, a) => sum + a.score, 0) / session.answers_json.length) * 10) / 10;
  const overallStrengths = Array.from(new Set(session.answers_json.flatMap((a) => a.feedback.strengths))).slice(0, 3);
  const overallImprovements = Array.from(new Set(session.answers_json.flatMap((a) => a.feedback.improvements))).slice(0, 3);

  const feedback = { averageScore, overallStrengths, overallImprovements };
  session.feedback_json = feedback;
  await db.updateInterviewSession(session);

  // 전체 Q&A 이력 함께 반환 (다시보기 기능용)
  const history = session.answers_json.map((a) => {
    const q = session.questions_json.find((q) => q.id === a.questionId);
    return { question: q?.text ?? "", answer: a.answerText, score: a.score, feedback: a.feedback };
  });

  res.status(200).json({
    ...feedback,
    history,
    questions: session.questions_json,
    personaType: session.persona_type ?? "startup",
    jdText: session.jd_text
  });
});
