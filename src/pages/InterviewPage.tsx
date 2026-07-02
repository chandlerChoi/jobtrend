import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { startInterview } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useCredits } from "../context/CreditContext";

const PERSONAS = [
  { id: "startup",    label: "스타트업",    emoji: "🚀", desc: "실행력·적응력 중심, 빠른 Q&A" },
  { id: "enterprise", label: "대기업 임원",  emoji: "🏢", desc: "조직문화·리더십·격식체" },
  { id: "public",     label: "공공기관",     emoji: "🏛️", desc: "공직가치·성실성·구조화 질문" },
  { id: "finance",    label: "금융권",       emoji: "💼", desc: "수치 분석력·리스크·윤리의식" },
  { id: "tech",       label: "테크니컬",     emoji: "💻", desc: "기술 깊이·설계 사고·꼬리질문" },
  { id: "newcomer",   label: "신입 친화형",  emoji: "🌱", desc: "잠재력·성장가능성·부드러운 어투" },
];

export default function InterviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { credits, refresh } = useCredits();
  const [jd, setJd] = useState((location.state as { jdText?: string } | null)?.jdText ?? "");
  const [resume, setResume] = useState("");
  const [persona, setPersona] = useState("startup");
  const [submitting, setSubmitting] = useState(false);
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  async function handleStart() {
    if (!jd.trim()) return;
    setSubmitting(true);
    setInsufficientCredits(false);
    try {
      const result = await startInterview({ jdText: jd, resumeText: resume || undefined, persona });
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
        <h1 className="text-3xl font-bold text-gray-900">AI 모의면접</h1>
        <p className="mt-1 text-sm text-gray-500">
          JD와 이력서를 입력하면 예상 질문 5개를 생성해드려요.
        </p>
        <p className="mt-1 text-sm font-medium text-brand-600">남은 크레딧: {credits}회</p>
      </div>

      {/* 면접관 페르소나 — 6가지 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">면접관 유형 선택</p>
        <div className="grid grid-cols-3 gap-2.5">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPersona(p.id)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${
                persona === p.id
                  ? "border-brand-500 bg-brand-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="text-xl mb-1">{p.emoji}</p>
              <p className="text-xs font-semibold text-gray-900 leading-tight">{p.label}</p>
              <p className="mt-0.5 text-[11px] text-gray-500 leading-tight">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">채용공고(JD)</label>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="지원하려는 공고의 직무·자격요건을 붙여넣어주세요."
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">이력서 (선택)</label>
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="이력서 내용을 붙여넣으면 더 맞춤화된 질문을 받을 수 있어요."
        />
      </div>

      {insufficientCredits && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          크레딧이 부족해요. 마이페이지에서 충전 후 다시 시도해주세요.
        </p>
      )}

      <button
        onClick={handleStart}
        disabled={!jd.trim() || submitting || credits <= 0}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
      >
        {credits <= 0 ? "크레딧이 부족해요" : submitting ? "질문 생성 중..." : "모의면접 시작"}
      </button>
    </div>
  );
}
