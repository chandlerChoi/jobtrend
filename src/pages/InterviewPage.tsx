import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { startInterview } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useCredits } from "../context/CreditContext";

export default function InterviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { credits, refresh } = useCredits();
  const [jd, setJd] = useState((location.state as { jdText?: string } | null)?.jdText ?? "");
  const [resume, setResume] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  async function handleStart() {
    if (!jd.trim()) return;
    setSubmitting(true);
    setInsufficientCredits(false);
    try {
      const result = await startInterview({ jdText: jd, resumeText: resume || undefined });
      await refresh();
      navigate(`/interview/${result.sessionId}`, { state: { questions: result.questions } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setInsufficientCredits(true);
      } else {
        throw err;
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold">AI 모의면접</h1>
        <p className="mt-1 text-sm text-white/50">JD와 이력서를 입력하면 예상 질문 5개를 생성해드려요. (남은 크레딧: {credits}회)</p>
      </div>
      <div>
        <label className="mb-1 block text-sm text-white/60">채용공고(JD)</label>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
          placeholder="지원하려는 공고의 직무·자격요건을 붙여넣어주세요."
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-white/60">이력서 (선택)</label>
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
          placeholder="이력서 내용을 붙여넣으면 더 맞춤화된 질문을 받을 수 있어요."
        />
      </div>

      {insufficientCredits && (
        <p className="text-sm text-rose-400">크레딧이 부족해요. 마이페이지에서 충전 후 다시 시도해주세요.</p>
      )}

      <button
        onClick={handleStart}
        disabled={!jd.trim() || submitting || credits <= 0}
        className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium disabled:opacity-40"
      >
        {credits <= 0 ? "크레딧이 부족해요" : submitting ? "질문 생성 중..." : "모의면접 시작"}
      </button>
    </div>
  );
}
