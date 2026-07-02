import { useEffect, useState } from "react";
import { useCredits } from "../context/CreditContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { listStoryCards, listInterviewSessions, getInterviewDetail } from "../api/endpoints";
import type { InterviewSessionSummary, InterviewDetailResponse } from "../api/endpoints";
import type { StoryCardRow } from "../../shared/types";

const CREDIT_PACKS = [
  { credits: 5, price: 4900 },
  { credits: 10, price: 8900 }
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

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">미완료</span>;
  const color = score >= 80 ? "text-green-600" : score >= 60 ? "text-yellow-600" : "text-red-500";
  return <span className={`text-sm font-bold ${color}`}>{score}점</span>;
}

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
    try {
      const d = await getInterviewDetail(id);
      setDetail(d);
    } finally {
      setDetailLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (sessions.length === 0) return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
      <p className="text-sm text-gray-400">아직 완료한 면접이 없어요.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* 페르소나 필터 */}
      {personas.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterPersona("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterPersona === "all" ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-500 hover:border-gray-300"}`}>
            전체 ({sessions.length})
          </button>
          {personas.map((p) => (
            <button key={p} onClick={() => setFilterPersona(p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterPersona === p ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-500 hover:border-gray-300"}`}>
              {PERSONA_EMOJIS[p] ?? ""} {PERSONA_LABELS[p] ?? p}
            </button>
          ))}
        </div>
      )}

      {filtered.map((s) => (
        <div key={s.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {/* 세션 행 */}
          <button onClick={() => toggleDetail(s.id)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl shrink-0">{PERSONA_EMOJIS[s.persona_type] ?? "🎤"}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">{PERSONA_LABELS[s.persona_type] ?? s.persona_type}</p>
                <p className="text-xs text-gray-400 truncate">{s.jd_text || "공고 정보 없음"}</p>
                <p className="text-[10px] text-gray-300 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  {" · "}{s.answeredCount}/{s.questionCount}문항 완료
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <ScoreBadge score={s.averageScore} />
              <span className="text-gray-300 text-xs">{expandedId === s.id ? "▲" : "▼"}</span>
            </div>
          </button>

          {/* 상세 Q&A */}
          {expandedId === s.id && (
            <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-4">
              {detailLoading ? (
                <div className="flex justify-center py-4"><div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>
              ) : detail ? (
                detail.history.map((h, i) => (
                  <div key={i} className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-700">Q{i + 1}. {h.question}</p>
                    <p className="text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100 leading-relaxed">{h.answer}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 pl-1">
                      {h.feedback.strengths.slice(0, 1).map((s, j) => (
                        <span key={j} className="text-[11px] text-brand-600">+ {s}</span>
                      ))}
                      {h.feedback.improvements.slice(0, 1).map((imp, j) => (
                        <span key={j} className="text-[11px] text-amber-600">! {imp}</span>
                      ))}
                      {h.feedback.quickTip && (
                        <span className="text-[11px] text-gray-400 italic">💡 {h.feedback.quickTip}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-right text-gray-400">{h.score}점</p>
                  </div>
                ))
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function MyPage() {
  const { credits, planTier, loading: creditsLoading, charge } = useCredits();
  const [cards, setCards] = useState<StoryCardRow[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    listStoryCards().then((res) => setCards(res.cards)).finally(() => setCardsLoading(false));
  }, []);

  return (
    <div className="max-w-2xl space-y-8 animate-fadeUp">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
        <p className="mt-1 text-sm text-gray-500">면접 기록과 크레딧을 관리하세요.</p>
      </div>

      {/* 크레딧 */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">현재 플랜</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{planTier}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">남은 크레딧</p>
            {creditsLoading ? <LoadingSpinner /> : (
              <p className="text-3xl font-bold text-brand-500">{credits}<span className="text-sm text-gray-400 ml-1">회</span></p>
            )}
          </div>
        </div>
        <div className="h-3 rounded-full bg-gray-100">
          <div className="h-3 rounded-full bg-brand-500 transition-all" style={{ width: `${Math.min(100, (credits / 10) * 100)}%` }} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">크레딧 충전</h2>
        <div className="grid grid-cols-2 gap-3">
          {CREDIT_PACKS.map((pack) => (
            <button key={pack.credits} onClick={() => charge(pack.credits)}
              className="rounded-xl border-2 border-gray-200 bg-white p-5 text-left hover:border-brand-500 transition-colors">
              <p className="text-xl font-bold text-gray-900">{pack.credits}회</p>
              <p className="text-2xl font-bold text-brand-500 mt-1">{pack.price.toLocaleString()}원</p>
              <p className="text-xs text-gray-400 mt-1">세션당 {Math.round(pack.price / pack.credits).toLocaleString()}원</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">* 결제 연동 전 데모 — 충전 시 즉시 크레딧이 추가됩니다.</p>
      </section>

      {/* 면접 기록 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">AI 면접 기록</h2>
          <a href="/interview" className="text-xs font-medium text-brand-600 hover:underline">새 면접 시작 →</a>
        </div>
        <InterviewHistorySection />
      </section>

      {/* 스토리뱅크 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">스토리뱅크</h2>
          <a href="/story-bank" className="text-xs font-medium text-brand-600 hover:underline">
            {cards.length > 0 ? "이어서 채굴하기" : "채굴 시작하기"}
          </a>
        </div>
        {cardsLoading ? <LoadingSpinner /> : cards.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-400">아직 채굴한 스토리가 없어요. 10개의 질문으로 나만의 이야기를 정리해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-400">{c.slot_id}</p>
                <p className="text-sm font-semibold text-gray-900">{c.slot_name}</p>
                <p className="mt-1 text-xs text-gray-400">{c.status === "slot_complete" ? "완성" : "일부 미완성"}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
