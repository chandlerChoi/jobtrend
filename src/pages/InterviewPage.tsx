import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { startInterview, listBookmarks, listInterviewSessions, listStoryCards, listStoryBankVersions } from "../api/endpoints";
import { useJdOcr, SavedJdChips } from "../components/feature/JdOcr";
import { ApiError } from "../api/client";
import { useCredits } from "../context/CreditContext";
import type { RecruitmentNewsRow, StoryCardRow, StoryBankVersion } from "../../shared/types";
import type { InterviewSessionSummary } from "../api/endpoints";

const SIDEBAR_KEY = "jobtrend_interview_sidebar";

// ── 페르소나 그룹 ──────────────────────────────────────────────────────────────
const INDUSTRY_PERSONAS = [
  { id: "startup",    emoji: "🚀", label: "스타트업",      desc: "실행력·속도·구체적 결과" },
  { id: "enterprise", emoji: "🏢", label: "대기업 임원",   desc: "격식체·조직문화·리더십" },
  { id: "public",     emoji: "🏛️", label: "공공기관",      desc: "공직가치·성실성·구조화" },
  { id: "finance",    emoji: "💼", label: "금융권",         desc: "수치·리스크·윤리의식" },
  { id: "tech",       emoji: "💻", label: "테크니컬",       desc: "기술 깊이·설계 사고·꼬리질문" },
  { id: "global",     emoji: "🌍", label: "외국계/글로벌", desc: "한·영 혼용·글로벌 마인드셋" },
];

const STYLE_PERSONAS = [
  { id: "newcomer",   emoji: "🌱", label: "신입 친화형",   desc: "잠재력·성장가능성·부드러운 어투" },
  { id: "stress",     emoji: "😤", label: "압박 면접",      desc: "반론·꼬리질문·흔들기" },
  { id: "competency", emoji: "📋", label: "역량구조화",     desc: "STAR 고집·수치 요구" },
  { id: "culture",    emoji: "🤝", label: "컬처핏",         desc: "가치관·팀워크·협업 방식" },
  { id: "case",       emoji: "🧮", label: "케이스인터뷰",  desc: "논리·추정문제·프레임워크" },
  { id: "career",     emoji: "🗺️", label: "커리어패스",    desc: "성장경로·비전·5년 계획" },
];

const PERSONA_LABELS: Record<string, string> = {
  startup: "스타트업", enterprise: "대기업 임원", public: "공공기관",
  finance: "금융권", tech: "테크니컬", global: "외국계/글로벌",
  newcomer: "신입친화형", stress: "압박 면접", competency: "역량구조화",
  culture: "컬처핏", case: "케이스인터뷰", career: "커리어패스",
};

const PERSONA_EMOJIS: Record<string, string> = {
  startup: "🚀", enterprise: "🏢", public: "🏛️", finance: "💼",
  tech: "💻", global: "🌍", newcomer: "🌱", stress: "😤",
  competency: "📋", culture: "🤝", case: "🧮", career: "🗺️",
};

type HintMode = "none" | "keywords";
type ResumeSource = "storybank" | "manual" | string; // string = 버전 id

const SECTION_ORDER = ["intro", "motivation", "competency", "growth"] as const;

// 스토리 카드들을 이력서 대용 텍스트로 요약
function storyCardsToResume(cards: StoryCardRow[]): string {
  return cards
    .map((c) => `[${c.slot_name}]\n${c.raw_answers.filter(Boolean).join(" ")}`)
    .join("\n\n");
}

// 공고별 버전의 자소서 섹션을 이력서 텍스트로 변환
// 표준 4섹션 우선, 그 외 키(full/other 등)도 포함 (_로 시작하는 메타키 제외)
function versionToResume(v: StoryBankVersion): string {
  const standard = SECTION_ORDER.map((key) => v.story_content[key]).filter(Boolean);
  const extras = Object.entries(v.story_content)
    .filter(([k, val]) => !k.startsWith("_") && !(SECTION_ORDER as readonly string[]).includes(k) && val)
    .map(([, val]) => val);
  return [...standard, ...extras].join("\n\n");
}

function PersonaChip({ persona, session }: { persona: string; session: InterviewSessionSummary }) {
  const labels = persona.split("|").map((p) => `${PERSONA_EMOJIS[p] ?? ""}${PERSONA_LABELS[p] ?? p}`).join(" + ");
  const score = session.averageScore;
  const scoreColor = score === null ? "text-gray-400" : score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-500";
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-brand-700 font-medium truncate">{labels}</span>
      <span className={`text-xs font-bold shrink-0 ml-1 ${scoreColor}`}>{score !== null ? `${score}점` : "미완료"}</span>
    </div>
  );
}

export default function InterviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { credits, refresh } = useCredits();
  const [jd, setJd] = useState((location.state as { jdText?: string } | null)?.jdText ?? "");
  const [resume, setResume] = useState("");
  const [industryPersona, setIndustryPersona] = useState<string | null>(null);
  const [stylePersona, setStylePersona] = useState<string | null>(null);
  const [hintMode, setHintMode] = useState<HintMode>("keywords");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 북마크 사이드바
  const [showSidebar, setShowSidebar] = useState(() => localStorage.getItem(SIDEBAR_KEY) === "true");
  const [bookmarks, setBookmarks] = useState<RecruitmentNewsRow[]>([]);

  // 이전 면접 기록 패널 (오른쪽)
  const [pastSessions, setPastSessions] = useState<InterviewSessionSummary[]>([]);
  const sessionsRef = useRef<HTMLDivElement>(null);

  // 이력서 자동 로드 소스: 스토리뱅크 / 공고별 버전 / 직접 입력
  const [storyCards, setStoryCards] = useState<StoryCardRow[]>([]);
  const [versions, setVersions] = useState<StoryBankVersion[]>([]);
  const [resumeSource, setResumeSource] = useState<ResumeSource>("manual");

  // JD 이미지 OCR + 내 공고 보관함 (공용 훅)
  const jdOcr = useJdOcr({
    onText: (text) => setJd((prev) => (prev.trim() ? prev + "\n\n" + text : text))
  });

  useEffect(() => {
    listBookmarks().then((r) => setBookmarks(r.news)).catch(() => {});
    listInterviewSessions().then((r) => setPastSessions(r.sessions)).catch(() => {});
    listStoryBankVersions().then((r) => setVersions(r.versions)).catch(() => {});
    listStoryCards().then((r) => {
      setStoryCards(r.cards);
      // 스토리뱅크가 있으면 자동으로 이력서 채움 (사용자가 이미 입력했으면 유지)
      if (r.cards.length > 0) {
        setResume((prev) => {
          if (prev.trim()) return prev;
          setResumeSource("storybank");
          return storyCardsToResume(r.cards);
        });
      }
    }).catch(() => {});
  }, []);

  function selectResumeSource(source: ResumeSource) {
    setResumeSource(source);
    if (source === "storybank") {
      setResume(storyCardsToResume(storyCards));
    } else if (source === "manual") {
      setResume("");
    } else {
      const v = versions.find((v) => v.id === source);
      if (v) setResume(versionToResume(v));
    }
  }

  function toggleSidebar() {
    setShowSidebar((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }

  const hasPersona = industryPersona !== null || stylePersona !== null;
  const canStart = jd.trim().length > 0 && hasPersona && credits > 0 && !submitting;

  async function handleStart() {
    if (!canStart) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await startInterview({
        jdText: jd,
        resumeText: resume || undefined,
        industryPersona: industryPersona ?? undefined,
        stylePersona: stylePersona ?? undefined,
      });
      await refresh();
      navigate(`/interview/${result.sessionId}`, {
        state: { questions: result.questions, hintMode }
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setError("크레딧이 부족해요. 마이페이지에서 충전 후 다시 시도해주세요.");
      } else if (err instanceof Error) {
        setError(`오류가 발생했어요: ${err.message}`);
      } else {
        setError("면접 시작 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const personaBadge = [industryPersona, stylePersona]
    .filter(Boolean)
    .map((p) => `${PERSONA_EMOJIS[p!] ?? ""}${PERSONA_LABELS[p!] ?? p}`)
    .join(" + ");

  return (
    <div className="flex items-start gap-5">
      {/* ── 메인 폼 ── */}
      <div className="min-w-0 flex-1 max-w-xl space-y-5 animate-fadeUp">
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

        {/* 기관/업종별 — 최대 1개 선택 */}
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            기관/업종별 <span className="text-gray-300 font-normal normal-case">(선택)</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {INDUSTRY_PERSONAS.map((p) => {
              const selected = industryPersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setIndustryPersona(selected ? null : p.id)}
                  className={`rounded-xl border-2 p-2.5 text-left transition-all ${
                    selected ? "border-brand-500 bg-brand-50 ring-1 ring-brand-300" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <p className="mt-0.5 text-xs font-semibold text-gray-900 leading-tight">{p.label}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500 leading-tight">{p.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 면접 스타일별 — 최대 1개 선택 */}
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            면접 스타일별 <span className="text-gray-300 font-normal normal-case">(선택)</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {STYLE_PERSONAS.map((p) => {
              const selected = stylePersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setStylePersona(selected ? null : p.id)}
                  className={`rounded-xl border-2 p-2.5 text-left transition-all ${
                    selected ? "border-purple-500 bg-purple-50 ring-1 ring-purple-300" : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <p className="mt-0.5 text-xs font-semibold text-gray-900 leading-tight">{p.label}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500 leading-tight">{p.desc}</p>
                </button>
              );
            })}
          </div>
          {!hasPersona && (
            <p className="mt-1.5 text-xs text-amber-600">기관/업종 또는 면접 스타일 중 하나 이상 선택해주세요.</p>
          )}
          {hasPersona && (
            <p className="mt-1.5 text-xs text-brand-600 font-medium">선택된 페르소나: {personaBadge}</p>
          )}
        </div>

        {/* 힌트 모드 */}
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">면접 모드</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: "none" as HintMode, emoji: "🎯", label: "자유 모드", desc: "힌트 없이 혼자 답변 — 실전 연습" },
              { id: "keywords" as HintMode, emoji: "💡", label: "키워드 힌트 모드", desc: "스토리뱅크 키워드 표시" },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => setHintMode(m.id)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${hintMode === m.id ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
              >
                <p className="text-base mb-0.5">{m.emoji}</p>
                <p className="text-xs font-semibold text-gray-900">{m.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* JD */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">채용공고(JD) <span className="text-red-400">*</span></label>
            <button
              onClick={jdOcr.openFilePicker}
              className="text-xs text-brand-600 hover:underline"
            >
              🖼️ 공고 이미지 추가
            </button>
          </div>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            onPaste={jdOcr.handlePaste}
            rows={5}
            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="공고 텍스트를 붙여넣거나, 공고 이미지를 복사해서 여기에 붙여넣으세요. (이미지 여러 장 가능)"
          />
          {jdOcr.ui}
          <SavedJdChips
            savedJds={jdOcr.savedJds}
            onSelect={(sjd) => setJd(sjd.text)}
            onRemove={jdOcr.removeSaved}
          />
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

        {/* 이력서 — 저장된 데이터 자동 로드 + 수동 선택 */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">이력서 (선택)</label>
          {(storyCards.length > 0 || versions.length > 0) && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {storyCards.length > 0 && (
                <button
                  onClick={() => selectResumeSource("storybank")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    resumeSource === "storybank"
                      ? "bg-brand-500 text-white"
                      : "border border-gray-200 text-gray-600 hover:border-brand-400"
                  }`}
                >
                  📖 스토리뱅크 ({storyCards.length}개 스토리)
                </button>
              )}
              {versions.slice(0, 4).map((v) => (
                <button
                  key={v.id}
                  onClick={() => selectResumeSource(v.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    resumeSource === v.id
                      ? "bg-purple-500 text-white"
                      : "border border-gray-200 text-gray-600 hover:border-purple-400"
                  }`}
                >
                  📄 {v.version_name}
                </button>
              ))}
              <button
                onClick={() => selectResumeSource("manual")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  resumeSource === "manual"
                    ? "bg-gray-700 text-white"
                    : "border border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                ✏️ 직접 입력
              </button>
            </div>
          )}
          <textarea
            value={resume}
            onChange={(e) => { setResume(e.target.value); setResumeSource("manual"); }}
            rows={resumeSource !== "manual" && resume ? 5 : 3}
            className="w-full rounded-lg border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="이력서 내용을 붙여넣으면 더 맞춤화된 질문을 받을 수 있어요."
          />
          {resumeSource === "storybank" && resume && (
            <p className="mt-1 text-[11px] text-brand-600">✓ 스토리뱅크에서 자동으로 불러왔어요. 수정해도 원본은 바뀌지 않아요.</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {!hasPersona && jd.trim() && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
            면접관 유형을 먼저 선택해주세요.
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {credits <= 0 ? "크레딧이 부족해요" : !hasPersona ? "면접관 유형을 선택해주세요" : submitting ? "질문 생성 중..." : "모의면접 시작"}
        </button>
      </div>

      {/* ── 오른쪽: 이전 면접 기록 + 북마크 ── */}
      <div className="w-64 shrink-0 space-y-3 sticky top-4">
        {/* 이전 면접 기록 */}
        {pastSessions.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700">🕐 이전 면접 기록</p>
              <a href="/mypage" className="text-[10px] text-brand-600 hover:underline">전체 보기</a>
            </div>
            <div ref={sessionsRef} className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {pastSessions.map((s) => (
                <div
                  key={s.id}
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setJd(s.jd_text)}
                >
                  <PersonaChip persona={s.persona_type} session={s} />
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{s.jd_text || "공고 정보 없음"}</p>
                  <p className="text-[10px] text-gray-300">
                    {new Date(s.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    {" · "}{s.answeredCount}/{s.questionCount}문항
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 북마크 사이드바 */}
        {showSidebar && (
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-700">📌 저장한 공고</p>
              <button onClick={toggleSidebar} className="text-[10px] text-gray-400 hover:text-gray-600">닫기</button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {bookmarks.length === 0 ? (
                <p className="px-3 py-4 text-xs text-gray-400 text-center">저장한 공고가 없어요.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {bookmarks.map((b) => (
                    <div key={b.id}
                      className="px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setJd(`[${b.company_name}] ${b.title}\n${b.posting_url ?? ""}`)}>
                      <p className="text-xs font-medium text-gray-800 leading-tight">{b.company_name}</p>
                      <p className="text-[11px] text-gray-500 leading-tight mt-0.5 line-clamp-2">{b.title}</p>
                      {b.posting_url && (
                        <a href={b.posting_url} target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5 text-[10px] text-brand-600 hover:underline block">
                          원문 →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
