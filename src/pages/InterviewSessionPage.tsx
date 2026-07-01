import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useInterviewSession } from "../hooks/useInterviewSession";
import type { InterviewQuestion } from "../../shared/types";

function ChatBubble({ role, children }: { role: "interviewer" | "candidate"; children: React.ReactNode }) {
  const isInterviewer = role === "interviewer";
  return (
    <div className={`flex ${isInterviewer ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isInterviewer
            ? "bg-gray-100 text-gray-800 rounded-tl-sm"
            : "bg-brand-500 text-white rounded-tr-sm"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

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
      {/* Progress bar */}
      {!isComplete && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>진행 중</span>
            <span>{step + 1} / {totalSteps}</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-brand-500 transition-all"
              style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {history.map((h, i) => (
          <div key={i} className="space-y-2">
            <ChatBubble role="interviewer">{h.question}</ChatBubble>
            <ChatBubble role="candidate">{h.answer}</ChatBubble>

            {/* 실시간 코칭 */}
            <div className="ml-2 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 space-y-1.5">
              {h.feedback.strengths.map((s, j) => (
                <p key={`s${j}`} className="text-sm text-brand-600">
                  <span className="font-bold">+</span> {s}
                </p>
              ))}
              {h.feedback.improvements.map((s, j) => (
                <p key={`i${j}`} className="text-sm text-amber-600">
                  <span className="font-bold">!</span> {s}
                </p>
              ))}
              {(h.feedback as { quickTip?: string }).quickTip && (
                <p className="text-sm text-gray-500 italic border-t border-gray-200 pt-1.5 mt-1.5">
                  💡 {(h.feedback as { quickTip?: string }).quickTip}
                </p>
              )}
            </div>
          </div>
        ))}

        {!isComplete && currentQuestion && (
          <ChatBubble role="interviewer">
            {currentQuestion.text}
          </ChatBubble>
        )}
      </div>

      {!isComplete && currentQuestion && (
        <div className="space-y-3">
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-gray-200 bg-white p-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="답변을 입력해주세요."
          />
          <button
            onClick={handleSubmit}
            disabled={!answerText.trim() || submitting}
            className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
          >
            {submitting ? "평가 중..." : "답변 제출"}
          </button>
        </div>
      )}

      {isComplete && summary && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">평균 점수</p>
            <p className="text-5xl font-bold text-brand-500 mt-1">{summary.averageScore}<span className="text-lg text-gray-400">점</span></p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-brand-50 p-4">
              <p className="text-sm font-semibold text-brand-600 mb-2">강점</p>
              {summary.overallStrengths.map((s, i) => (
                <p key={i} className="text-sm text-gray-700 before:content-['✓_'] before:text-brand-500">{s}</p>
              ))}
            </div>
            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-600 mb-2">보완점</p>
              {summary.overallImprovements.map((s, i) => (
                <p key={i} className="text-sm text-gray-700 before:content-['!_'] before:text-amber-500">{s}</p>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              다시 연습하기
            </button>
            <a href="/news" className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white text-center hover:bg-brand-600">
              다른 공고 찾기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
