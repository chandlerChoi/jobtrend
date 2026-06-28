import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useInterviewSession } from "../hooks/useInterviewSession";
import ChatBubble from "../components/feature/ChatBubble";
import type { InterviewQuestion } from "../../shared/types";

export default function InterviewSessionPage() {
  const { sessionId = "" } = useParams();
  const location = useLocation();
  const questions = (location.state as { questions?: InterviewQuestion[] } | null)?.questions ?? [];

  const { currentQuestion, step, totalSteps, history, summary, isComplete, submitting, answer } =
    useInterviewSession(sessionId, questions);
  const [answerText, setAnswerText] = useState("");

  function handleSubmit() {
    if (!answerText.trim()) return;
    answer(answerText);
    setAnswerText("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-fadeUp">
      <div className="space-y-3">
        {history.map((h, i) => (
          <div key={i} className="space-y-2">
            <ChatBubble role="interviewer">{h.question}</ChatBubble>
            <ChatBubble role="candidate">{h.answer}</ChatBubble>
            <div className="ml-2 space-y-1 text-xs">
              {h.feedback.strengths.map((s, j) => (
                <p key={`s${j}`} className="text-emerald-400">
                  + {s}
                </p>
              ))}
              {h.feedback.improvements.map((s, j) => (
                <p key={`i${j}`} className="text-amber-400">
                  ! {s}
                </p>
              ))}
            </div>
          </div>
        ))}

        {!isComplete && currentQuestion && (
          <ChatBubble role="interviewer">
            ({step + 1}/{totalSteps}) {currentQuestion.text}
          </ChatBubble>
        )}
      </div>

      {!isComplete && currentQuestion && (
        <div className="space-y-2">
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
            placeholder="답변을 입력해주세요."
          />
          <button
            onClick={handleSubmit}
            disabled={!answerText.trim() || submitting}
            className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium disabled:opacity-40"
          >
            {submitting ? "평가 중..." : "답변 제출"}
          </button>
        </div>
      )}

      {isComplete && summary && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-lg font-bold">모의면접 결과</h2>
          <p className="mt-1 text-sm text-white/60">평균 점수 {summary.averageScore}점</p>
          <ul className="mt-3 list-disc pl-5 text-sm text-emerald-400">
            {summary.overallStrengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-400">
            {summary.overallImprovements.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
