import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { startInterview, listBookmarks } from "../api/endpoints";
import { ApiError } from "../api/client";
import { useCredits } from "../context/CreditContext";
import type { RecruitmentNewsRow } from "../../shared/types";

const SIDEBAR_KEY = "jobtrend_interview_sidebar";

// ── 12 페르소나 ──────────────────────────────────────────────────────────────
const PERSONA_GROUPS = [
  {
    label: "기관/업종별",
    items: [
      { id: "startup",    emoji: "🚀", label: "스타트업",       desc: "실행력·속도·구체적 결과 중심" },
      { id: "enterprise", emoji: "🏢", label: "대기업 임원",    desc: "격식체·조직문화·리더십" },
      { id: "public",     emoji: "🏛️", label: "공공기관",       desc: "공직가치·성실성·구조화 질문" },
      { id: "finance",    emoji: "💼", label: "금융권",          desc: "수치·리스크·윤리의식" },
      { id: "tech",       emoji: "💻", label: "테크니컬",        desc: "기술 깊이·설계 사고·꼬리질문" },
      { id: "global",     emoji: "🌍", label: "외국계/글로벌",  desc: "한·영 혼용·글로벌 마인드셋" },
    ]
  },
  {
    label: "면접 스타일별",
    items: [
      { id: "newcomer",   emoji: "🌱", label: "신입 친화형",    desc: "잠재력·성장가능성·부드러운 어투" },
      { id: "stress",     emoji: "😤", label: "압박 면접",       desc: "반론·꼬리질문·흔들기" },
      { id: "competency", emoji: "📋", label: "역량구조화",      desc: "STAR 고집·수치 요구" },
      { id: "culture",    emoji: "🤝", label: "컬처핏",          desc: "가치관·팀워크·협업 방식" },
      { id: "case",       emoji: "🧮", label: "케이스인터뷰",   desc: "논리·추정문제·프레임워크" },
      { id: "career",     emoji: "🗺️", label: "커리어패스",     desc: "성장경로·비전·5년 계획" },
    ]
  }
];

type HintMode = "none" | "keywords";

export default function InterviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { credits, refresh } = useCredits();
  const [jd, setJd] = useState((location.state as { jdText?: string } | null)?.jdText ?? "");
  const [resume, setResume] = useState("");
  const [persona, setPersona] = useState("startup");
  const [hintMode, setHintMode] = useState<HintMode>("keywords");
  const [submitting, setSubmitting] = useState(false);
  const [insufficientCredits, setInsufficientCredits] = useState(false);

  // 북마크 사이드바 — localStorage 영구 저장
  const [showSidebar, setShowSidebar] = useState(() => localStorage.getItem(SIDEBAR_KEY) === "true");
  const [bookmarks, setBookmarks] = useState<RecruitmentNewsRow[]>([]);

  useEffect(() => {
    listBookmarks().then((r) => setBookmarks(r.news)).catch(() => {});
  }, []);

  function toggleSidebar() {
    setShowSidebar((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }

  async function handleStart() {
    if (!jd.trim()) return;
    setSubmitting(true);
    setInsufficientCredits(false);
    try {
      const result = await startInterview({ jdText: jd, resumeText: resume || undefined, persona });
      await refresh();
      navigate(`/interview/${result.sessionId}`, {
        state: { questions: result.questions, hintMode }
      });
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
    <div className="flex items-start gap-6">
      {/* 메인 폼 */}
      <div className="min-w-0 flex-1 max-w-2xl space-y-5 animate-fadeUp">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI 모의면접</h1>
            <p className="mt-1 text-sm text-gray-500">JD와 이력서를 입력하면 맞춤 질문 5개를 생성해드려요.</p>
            <p className="mt-0.5 text-sm font-medium text-brand-600">남은 크레딧: {credits}회</p>
          </div>
          <button
            onClick={toggleSidebar}
            className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${showSidebar ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
          >
            📌 저장한 공고 {bookmarks.length > 0 && `(${bookmarks.length})`}
          </button>
        </div>

        {/* 12 페르소나 */}
        {PERSONA_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.label}</p>
            <div className="grid grid-cols-3 gap-2">
              {group.items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersona(p.id)}
                  className={`rounded-xl border-2 p-2.5 text-left transition-all ${
                    persona === p.id ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <p className="mt-0.5 text-xs font-semibold text-gray-900 leading-tight">{p.label}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500 leading-tight">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 힌트 모드 선택 */}
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">면접 모드</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setHintMode("none")}
              className={`rounded-xl border-2 p-3 text-left transition-all ${hintMode === "none" ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
            >
              <p className="text-base mb-0.5">🎯</p>
              <p className="text-xs font-semibold text-gray-900">자유 모드</p>
              <p className="text-[10px] text-gray-500 mt-0.5">힌트 없이 혼자 답변 — 실전 연습</p>
            </button>
            <button
              onClick={() => setHintMode("keywords")}
              className={`rounded-xl border-2 p-3 text-left transition-all ${hintMode === "keywords" ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
            >
              <p className="text-base mb-0.5">💡</p>
              <p className="text-xs font-semibold text-gray-900">키워드 힌트 모드</p>
              <p className="text-[10px] text-gray-500 mt-0.5">스토리뱅크 키워드 표시</p>
            </button>
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
          {/* 저장한 공고 빠른 선택 */}
          {!showSidebar && bookmarks.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {bookmarks.slice(0, 5).map((b) => (
                <button key={b.id}
                  onClick={() => setJd(`[${b.company_name}] ${b.title}\n${b.posting_url ?? ""}`)}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:border-brand-400 hover:text-brand-600">
                  {b.company_name}
                </button>
              ))}
            </div>
          )}
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

      {/* 북마크 사이드바 — localStorage로 열림 상태 유지 */}
      {showSidebar && (
        <aside className="w-60 shrink-0 rounded-xl border border-gray-200 bg-white p-3 sticky top-4 max-h-[80vh] overflow-y-auto">
          <p className="text-xs font-semibold text-gray-700 mb-2">📌 저장한 공고</p>
          {bookmarks.length === 0 ? (
            <p className="text-xs text-gray-400">저장한 공고가 없어요.</p>
          ) : (
            <div className="space-y-2">
              {bookmarks.map((b) => (
                <div key={b.id}
                  className="rounded-lg border border-gray-100 p-2 cursor-pointer hover:border-brand-300 transition-colors"
                  onClick={() => setJd(`[${b.company_name}] ${b.title}\n${b.posting_url ?? ""}`)}
                >
                  <p className="text-xs font-medium text-gray-800 leading-tight">{b.company_name}</p>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5 line-clamp-2">{b.title}</p>
                  {b.posting_url && (
                    <a href={b.posting_url} target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 text-[10px] text-brand-600 hover:underline block">
                      원문 보기 →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
