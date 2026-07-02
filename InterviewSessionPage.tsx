import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useInterviewSession } from "../hooks/useInterviewSession";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import ChatBubble from "../components/feature/ChatBubble";
import type { InterviewQuestion } from "../../shared/types";

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v6a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm7 7a1 1 0 0 1 1 1 8 8 0 0 1-7 7.938V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.062A8 8 0 0 1 4 11a1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

export default function InterviewSessionPage() {
  const { sessionId = "" } = useParams();
  const location = useLocation();
  const questions = (location.state as { questions?: InterviewQuestion[] } | null)?.questions ?? [];

  const { currentQuestion, step, totalSteps, history, summary, isComplete, submitting, answer } =
    useInterviewSession(sessionId, questions);
  const [answerText, setAnswerText] = useState("");
  const { listening, start, stop, supported } = useSpeechRecognition();

  function handleSubmit() {
    if (!answerText.trim()) return;
    answer(answerText);
    setAnswerText("");
  }

  function handleMicClick() {
    if (listening) {
      stop();
    } else {
      start((transcript) => {
        setAnswerText((prev) => (prev ? prev + " " + transcript : transcript));
      });
    }
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
          <div className="relative">
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
              placeholder={listening ? "음성을 인식하는 중..." : "답변을 입력하거나 마이크를 눌러 말씀하세요."}
            />
            {listening && (
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2 py-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                <span className="text-xs text-rose-400">녹음 중</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {supported && (
              <button
                onClick={handleMicClick}
                disabled={submitting}
                title={listening ? "클릭하면 녹음 중지" : "마이크로 답변하기"}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                  listening
                    ? "bg-rose-500 text-white hover:bg-rose-600"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {listening ? <StopIcon /> : <MicIcon />}
                {listening ? "녹음 중지" : "음성 입력"}
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!answerText.trim() || submitting || listening}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {submitting ? "평가 중..." : "답변 제출"}
            </button>
          </div>
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
