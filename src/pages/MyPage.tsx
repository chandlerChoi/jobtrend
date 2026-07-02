import { useEffect, useState } from "react";
import { useCredits } from "../context/CreditContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  listStoryCards,
  listInterviewSessions,
  getInterviewDetail,
  listBookmarks,
  listJobFairs,
} from "../api/endpoints";
import type { InterviewSessionSummary, InterviewDetailResponse } from "../api/endpoints";
import type { StoryCardRow, RecruitmentNewsRow, JobFairRow } from "../../shared/types";

const CREDIT_PACKS = [
  { credits: 5, price: 4900 },
  { credits: 10, price: 8900 },
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

function personaLabel(personaStr: string) {
  return personaStr.split("|").map((p) =>
    `${PERSONA_EMOJIS[p] ?? ""}${PERSONA_LABELS[p] ?? p}`
  ).join(" + ");
}

// ── 섹션 공통 헤더 ──────────────────────────────────────────────────────────
function SectionHeader({ icon, title, count, href, linkLabel }: {
  icon: string; title: string; count?: number; href: string; linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{count}</span>
        )}
      </div>
      <a href={href} className="text-xs font-medium text-brand-600 hover:underline">{linkLabel} →</a>
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

// ── 1. 저장한 공고 ──────────────────────────────────────────────────────────
function BookmarksSection() {
  const [items, setItems] = useState<RecruitmentNewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listBookmarks().then((r) => setItems(r.news)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  return (
    <section>
      <SectionHeader icon="📌" title="저장한 공고" count={items.length} href="/news" linkLabel="공고 더 보기" />
      {items.length === 0 ? (
        <EmptyCard message="저장한 공고가 없어요. 공고 페이지에서 북마크해보세요." />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {items.slice(0, 6).map((n) => (
            <a key={n.id} href={n.posting_url ?? "#"} target="_blank" rel="noreferrer"
              className="block rounded-xl border border-gray-200 bg-white p-3 hover:border-brand-400 hover:shadow-sm transition-all">
              <p className="text-[11px] font-bold text-brand-600 mb-0.5">{n.company_name}</p>
              <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-2">{n.title}</p>
              {n.closing_at && (
                <p className="text-[10px] text-gray-400 mt-1">마감 {n.closing_at}</p>
              )}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

// ── 2. AI 면접 기록 ──────────────────────────────────────────────────────────
function InterviewHistorySection() {
  const [sessions, setSessions] = useState<InterviewSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPersona, setFilterPersona] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InterviewDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    listInterviewSessions().then((r) => setSessions(r.sessions)).finally(() => setLoading(false));
  }, []);

  const personas = Array.from(new Set(sessions.map((s) => s.persona_type)));
  const filtered = filterPersona === "all" ? sessions : sessions.filter((s) => s.persona_type === filterPersona);

  async function toggleDetail(id: string) {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return; }
    setExpandedId(id);
    setDetail(null);
    setDetailLoading(true);
    try { setDetail(await getInterviewDetail(id)); }
    finally { setDetailLoading(false); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <section>
      <SectionHeader icon="🎤" title="AI 모의면접 기록" count={sessions.length} href="/interview" linkLabel="새 면접 시작" />
      {sessions.length === 0 ? (
        <EmptyCard message="면접 기록이 없어요. AI 모의면접을 시작해보세요." />
      ) : (
        <div className="space-y-2">
          {/* 페르소나 필터 */}
          {personas.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button onClick={() => setFilterPersona("all")}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filterPersona === "all" ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                전체
              </button>
              {personas.map((p) => (
                <button key={p} onClick={() => setFilterPersona(p)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filterPersona === p ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  {personaLabel(p)}
                </button>
              ))}
            </div>
          )}

          {filtered.map((s) => {
            const score = s.averageScore;
            const scoreColor = score === null ? "text-gray-400" : score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-500";
            return (
              <div key={s.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <button onClick={() => toggleDetail(s.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                  <span className="text-xl shrink-0">
                    {s.persona_type.split("|").map((p) => PERSONA_EMOJIS[p] ?? "🎤").join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-700">{personaLabel(s.persona_type)}</p>
                    <p className="text-xs text-gray-400 truncate">{s.jd_text || "공고 정보 없음"}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{s.answeredCount}/{s.questionCount}문항
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${scoreColor}`}>{score !== null ? `${score}점` : "미완료"}</span>
                    <span className="text-gray-300 text-xs">{expandedId === s.id ? "▲" : "▼"}</span>
                  </div>
                </button>

                {expandedId === s.id && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-4">
                    {detailLoading ? (
                      <div className="flex justify-center py-3"><div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
                    ) : detail ? (
                      detail.history.map((h, i) => (
                        <div key={i} className="space-y-1.5">
                          <p className="text-xs font-semibold text-gray-700">Q{i + 1}. {h.question}</p>
                          <p className="text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100 leading-relaxed">{h.answer}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-1">
                            {h.feedback.strengths.slice(0, 1).map((str, j) => (
                              <span key={j} className="text-[11px] text-brand-600">+ {str}</span>
                            ))}
                            {h.feedback.improvements.slice(0, 1).map((imp, j) => (
                              <span key={j} className="text-[11px] text-amber-600">! {imp}</span>
                            ))}
                            {(h.feedback as { quickTip?: string }).quickTip && (
                              <span className="text-[11px] text-gray-400 italic">💡 {(h.feedback as { quickTip?: string }).quickTip}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-right text-gray-400">{h.score}점</p>
                        </div>
                      ))
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── 3. 스토리뱅크 ──────────────────────────────────────────────────────────
function StoryBankSection() {
  const [cards, setCards] = useState<StoryCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listStoryCards().then((r) => setCards(r.cards)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  const done = cards.filter((c) => c.status === "slot_complete").length;

  return (
    <section>
      <SectionHeader icon="⛏️" title="스토리뱅크" count={cards.length} href="/story-bank" linkLabel={cards.length > 0 ? "이어서 채굴" : "채굴 시작"} />
      {cards.length === 0 ? (
        <EmptyCard message="아직 채굴한 스토리가 없어요. 10개의 질문으로 나만의 이야기를 정리해보세요." />
      ) : (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${(done / Math.max(cards.length, 1)) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{done}/{cards.length} 완성</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {cards.map((c) => (
              <div key={c.id} className={`rounded-xl border p-3 ${c.status === "slot_complete" ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white"}`}>
                <p className="text-[10px] text-gray-400">{c.slot_id}</p>
                <p className="text-xs font-semibold text-gray-900">{c.slot_name}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${c.status === "slot_complete" ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                  {c.status === "slot_complete" ? "완성" : "진행 중"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ── 4. 채용행사 ──────────────────────────────────────────────────────────────
function JobFairsSection() {
  const [fairs, setFairs] = useState<JobFairRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listJobFairs().then((r) => setFairs(r.fairs.slice(0, 4))).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <section>
      <SectionHeader icon="🎪" title="채용행사" href="/job-fairs" linkLabel="전체 보기" />
      {fairs.length === 0 ? (
        <EmptyCard message="가까운 채용행사 정보가 없어요." />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {fairs.map((f) => (
            <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">{f.event_name}</p>
              {f.start_date && <p className="text-[10px] text-gray-400 mt-0.5">📅 {f.start_date}</p>}
              {f.event_place && <p className="text-[10px] text-gray-400">📍 {f.event_place}</p>}
              {f.area && <p className="text-[11px] text-brand-600 mt-0.5">{f.area}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── 메인 마이페이지 ──────────────────────────────────────────────────────────
export default function MyPage() {
  const { credits, planTier, loading: creditsLoading, charge } = useCredits();

  return (
    <div className="max-w-3xl space-y-10 animate-fadeUp">
      {/* 헤더 + 크레딧 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
          <p className="mt-1 text-sm text-gray-500">내 활동과 저장 기록을 한눈에 확인하세요.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-right shrink-0">
          <p className="text-[11px] text-gray-400 uppercase tracking-wide">{planTier} 플랜</p>
          {creditsLoading ? <LoadingSpinner /> : (
            <p className="text-3xl font-bold text-brand-500 mt-0.5">
              {credits}<span className="text-sm text-gray-400 ml-1">회</span>
            </p>
          )}
          <p className="text-[10px] text-gray-400 mt-0.5">남은 크레딧</p>
        </div>
      </div>

      {/* 크레딧 충전 */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💳</span>
          <h2 className="text-base font-bold text-gray-900">크레딧 충전</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CREDIT_PACKS.map((pack) => (
            <button key={pack.credits} onClick={() => charge(pack.credits)}
              className="rounded-xl border-2 border-gray-200 bg-white p-4 text-left hover:border-brand-500 hover:shadow-sm transition-all">
              <p className="text-xl font-bold text-gray-900">{pack.credits}회</p>
              <p className="text-2xl font-bold text-brand-500 mt-0.5">{pack.price.toLocaleString()}원</p>
              <p className="text-xs text-gray-400 mt-1">세션당 {Math.round(pack.price / pack.credits).toLocaleString()}원</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">* 결제 연동 전 데모 — 충전 시 즉시 크레딧이 추가됩니다.</p>
      </section>

      <div className="border-t border-gray-100" />

      {/* 4 섹션 그리드 (좌: 저장공고 + 채용행사, 우: 면접기록 + 스토리뱅크) */}
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div className="space-y-10">
          <BookmarksSection />
          <JobFairsSection />
        </div>
        <div className="space-y-10">
          <InterviewHistorySection />
          <StoryBankSection />
        </div>
      </div>
    </div>
  );
}
