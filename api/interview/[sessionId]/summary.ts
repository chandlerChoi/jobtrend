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
    res.status(200).json({ averageScore: 0, overallStrengths: [], overallImprovements: [] });
    return;
  }

  const averageScore =
    Math.round((session.answers_json.reduce((sum, a) => sum + a.score, 0) / session.answers_json.length) * 10) / 10;
  const overallStrengths = Array.from(new Set(session.answers_json.flatMap((a) => a.feedback.strengths))).slice(0, 3);
  const overallImprovements = Array.from(new Set(session.answers_json.flatMap((a) => a.feedback.improvements))).slice(0, 3);

  session.feedback_json = { averageScore, overallStrengths, overallImprovements };
  await db.updateInterviewSession(session);

  res.status(200).json(session.feedback_json);
});
