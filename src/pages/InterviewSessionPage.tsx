import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useInterviewSession } from "../hooks/useInterviewSession";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import ChatBubble from "../components/feature/ChatBubble";
import { getQuestionHint } from "../api/endpoints";
import type { QuestionHint } from "../api/endpoints";
import type { InterviewQuestion } from "../../shared/types";

type HintMode = "none" | "keywords";

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

// 스니펫에서 키워드 칩 추출 (구두점 기준 분리 + 짧은 단어 제거)
function extractKeywords(snippet: string): string[] {
  const chunks = snippet
    .replace(/[.。]/g, "||")
    .split("||")
    .map((s) => s.trim())
    .filter((s) => s.length > 4 && s.length < 40);
  return chunks.slice(0, 5);
}

// 힌트 패널 — RAG 질문 의도·답변 팁 + (있으면) 스토리채굴 키워드
function HintPanel({
  questionHint,
  hintLoading,
  storyHint
}: {
  questionHint: QuestionHint | null;
  hintLoading: boolean;
  storyHint?: { slotName: string; snippet: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const keywords = storyHint ? extractKeywords(storyHint.snippet) : [];

  if (hintLoading) {
    return (
      <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 flex items-center gap-2">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" />
        <p className="text-xs text-brand-600">힌트를 준비하는 중...</p>
      </div>
    );
  }
  if (!questionHint && !storyHint) return null;

  return (
    <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 space-y-2.5">
      {questionHint && (
        <>
          <div>
            <p className="text-[11px] font-bold text-brand-700 mb-0.5">🎯 질문 의도</p>
            <p className="text-xs text-gray-700 leading-relaxed">{questionHint.intent}</p>
          </div>
          {questionHint.hints.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-brand-700 mb-0.5">💡 답변 힌트</p>
              {questionHint.hints.map((h, i) => (
                <p key={i} className="text-xs text-gray-700 leading-relaxed before:content-['·_']">{h}</p>
              ))}
            </div>
          )}
        </>
      )}
      {storyHint && keywords.length > 0 && (
        <div className={questionHint ? "border-t border-brand-100 pt-2" : ""}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-bold text-brand-700">📖 내 스토리 키워드 — {storyHint.slotName}</p>
            <button onClick={() => setExpanded((e) => !e)} className="text-[10px] text-brand-500 hover:underline">
              {expanded ? "접기" : "전체 보기"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw, i) => (
              <span key={i} className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {kw}
              </span>
            ))}
          </div>
          {expanded && (
            <p className="text-xs text-gray-600 leading-relaxed border-t border-brand-100 pt-2 mt-2">{storyHint.snippet}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function InterviewSessionPage() {
  const { sessionId = "" } = useParams();
  const location = useLocation();
  const state = (location.state as { questions?: InterviewQuestion[]; hintMode?: HintMode } | null);
  const questions = state?.questions ?? [];
  const hintMode: HintMode = state?.hintMode ?? "keywords";

  const { currentQuestion, step, totalSteps, history, summary, isComplete, submitting, answer } =
    useInterviewSession(sessionId, questions);
  const [answerText, setAnswerText] = useState("");
  const { listening, start, stop, supported } = useSpeechRecognition();

  // 질문별 RAG 힌트 (키워드 힌트 모드에서만 요청, 질문 id별 캐시)
  const [questionHint, setQuestionHint] = useState<QuestionHint | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const hintCache = useRef<Record<number, QuestionHint | null>>({});

  useEffect(() => {
    if (hintMode !== "keywords" || !currentQuestion || isComplete) {
      setQuestionHint(null);
      return;
    }
    const qid = currentQuestion.id;
    if (qid in hintCache.current) {
      setQuestionHint(hintCache.current[qid]);
      return;
    }
    let cancelled = false;
    setHintLoading(true);
    setQuestionHint(null);
    getQuestionHint(currentQuestion.text)
      .then((r) => {
        hintCache.current[qid] = r.hint;
        if (!cancelled) setQuestionHint(r.hint);
      })
      .catch(() => { if (!cancelled) setQuestionHint(null); })
      .finally(() => { if (!cancelled) setHintLoading(false); });
    return () => { cancelled = true; };
  }, [hintMode, currentQuestion, isComplete]);

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
      {/* 힌트 모드 배지 */}
      <div className="flex items-center justify-between">
        <span />
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${hintMode === "keywords" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
          {hintMode === "keywords" ? "💡 키워드 힌트 모드" : "🎯 자유 모드"}
        </span>
      </div>

      {/* 진행 바 */}
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
            <div className="ml-2 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 space-y-1.5">
              {h.feedback.strengths.map((s, j) => (
                <p key={`s${j}`} className="text-sm text-brand-600"><span className="font-bold">+</span> {s}</p>
              ))}
              {h.feedback.improvements.map((s, j) => (
                <p key={`i${j}`} className="text-sm text-amber-600"><span className="font-bold">!</span> {s}</p>
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
          <ChatBubble role="interviewer">{currentQuestion.text}</ChatBubble>
        )}
      </div>

      {!isComplete && currentQuestion && (
        <div className="space-y-3">
          <div className="relative">
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleSubmit(); }}
              rows={5}
              className="w-full rounded-xl border border-gray-200 bg-white p-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder={listening ? "음성을 인식하는 중..." : "답변을 입력하거나 마이크를 눌러 말씀하세요. (Ctrl+Enter로 제출)"}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              <span className="text-xs text-gray-300">{answerText.length}자</span>
              {listening && (
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-[10px] text-red-500">녹음 중</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {supported && (
              <button
                onClick={handleMicClick}
                disabled={submitting}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                  listening ? "bg-red-500 text-white hover:bg-red-600" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {listening ? <StopIcon /> : <MicIcon />}
                {listening ? "녹음 중지" : "음성 입력"}
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!answerText.trim() || submitting || listening}
              className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
            >
              {submitting ? "평가 중..." : "답변 제출"}
            </button>
          </div>

          {/* 힌트 패널 — 키워드 힌트 모드에서만 */}
          {hintMode === "keywords" && (
            <HintPanel
              questionHint={questionHint}
              hintLoading={hintLoading}
              storyHint={currentQuestion.storyHint}
            />
          )}
        </div>
      )}

      {isComplete && summary && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">평균 점수</p>
            <p className="text-5xl font-bold text-brand-500 mt-1">
              {summary.averageScore}<span className="text-lg text-gray-400">점</span>
            </p>
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
            <a href="/mypage" className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-center text-gray-600 hover:bg-gray-50">
              면접 기록 보기
            </a>
            <a href="/news" className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white text-center hover:bg-brand-600">
              다른 공고 찾기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
