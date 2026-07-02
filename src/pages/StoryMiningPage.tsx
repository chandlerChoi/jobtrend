import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import ChatBubble from "../components/feature/ChatBubble";
import {
  startStoryMining, continueStoryMining, getActiveStoryMiningSession,
  listStoryBankVersions, createStoryBankVersion, updateStoryBankVersion, deleteStoryBankVersion,
  analyzeCoverLetter, listBookmarks
} from "../api/endpoints";
import type { StoryCardRow, StoryBankVersion, RecruitmentNewsRow, CoverLetterSection } from "../../shared/types";

type Tab = "mining" | "cover" | "versions";

interface Turn { question: string; answer?: string }

const SECTION_LABELS: Record<string, string> = {
  intro: "자기소개", motivation: "지원동기", competency: "직무역량", growth: "성장계획", full: "전체", other: "기타"
};
const SECTION_CHARS: Record<string, number> = {
  intro: 600, motivation: 600, competency: 500, growth: 400, full: 800, other: 500
};

const OPENING = "지금부터 당신의 경험에서 10개의 '진짜 이야기'를 꺼낼 거예요. 완성된 문장으로 말하지 않아도 괜찮습니다.";

// ─────────────────────────────────────────────────────────────────────────────
// 탭 1 — 스토리 채굴
// ─────────────────────────────────────────────────────────────────────────────
function MiningTab() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [slotName, setSlotName] = useState<string | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [checkpointNote, setCheckpointNote] = useState<string | null>(null);
  const [cards, setCards] = useState<StoryCardRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function startFresh() {
    setLoading(true);
    const res = await startStoryMining();
    setSessionId(res.sessionId);
    setSlotName(res.slotName ?? null);
    setSlotIndex(res.slotIndex ?? 0);
    setTurns([{ question: res.question ?? "" }]);
    setDone(false);
    setCheckpointNote(null);
    setLoading(false);
  }

  useEffect(() => {
    getActiveStoryMiningSession()
      .then((res) => {
        if (res.session && res.session.transcript.length > 0) {
          setSessionId(res.session.sessionId);
          setSlotName(res.session.slotName);
          setSlotIndex(res.session.slotIndex);
          setTurns(res.session.transcript.map((t) => ({ question: t.question, answer: t.answer || undefined })));
          setLoading(false);
        } else {
          return startFresh();
        }
      })
      .catch(() => startFresh());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, submitting]);

  async function handleSubmit() {
    if (!input.trim() || !sessionId || submitting) return;
    const answer = input.trim();
    setInput("");
    setSubmitting(true);
    setCheckpointNote(null);
    setTurns((prev) => { const n = [...prev]; n[n.length - 1] = { ...n[n.length - 1], answer }; return n; });
    try {
      const res = await continueStoryMining(sessionId, answer);
      if (res.lastCard) setCards((prev) => [...prev, res.lastCard!]);
      if (res.done) {
        setDone(true);
      } else {
        setSlotName(res.slotName ?? null);
        setSlotIndex(res.slotIndex ?? slotIndex);
        setCheckpointNote(res.checkpointNote ?? null);
        setTurns((prev) => [...prev, { question: res.question ?? "" }]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{OPENING}</p>
          <p className="mt-0.5 text-xs text-gray-400">대화는 자동 저장돼요. 언제든 나갔다가 이어서 진행할 수 있어요.</p>
        </div>
        {!done && turns.some((t) => t.answer) && (
          <button
            onClick={() => { if (window.confirm("진행 중인 인터뷰를 버리고 처음부터 다시 시작할까요?")) startFresh(); }}
            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            새로 시작하기
          </button>
        )}
      </div>

      {!done && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{slotName}</span>
            <span>{slotIndex + 1} / 10</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200">
            <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${((slotIndex + 1) / 10) * 100}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <ChatBubble role="interviewer">{t.question}</ChatBubble>
            {t.answer && <ChatBubble role="candidate">{t.answer}</ChatBubble>}
          </div>
        ))}
        {checkpointNote && <p className="text-center text-xs text-gray-400 italic px-4">{checkpointNote}</p>}
        <div ref={bottomRef} />
      </div>

      {!done && (
        <div className="space-y-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            rows={3}
            disabled={submitting}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
            placeholder="편하게 그때 상황을 얘기하듯 말씀해주세요."
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{input.length}자</span>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || submitting}
              className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
            >
              {submitting ? "..." : "전송"}
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 text-center">
          <p className="text-lg font-semibold text-gray-900">10개 스토리 채굴 완료!</p>
          <p className="text-sm text-gray-500">{cards.length}개의 스토리 카드가 마이페이지에 저장됐어요.</p>
          <Link to="/mypage" className="inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            마이페이지에서 확인하기
          </Link>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 탭 2 — 자소서 분석
// ─────────────────────────────────────────────────────────────────────────────
function CoverLetterTab({ bookmarks }: { bookmarks: RecruitmentNewsRow[] }) {
  const [coverText, setCoverText] = useState("");
  const [jobText, setJobText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{ sections: CoverLetterSection[]; followUpQuestions: { key: string; question: string }[]; overallScore: number } | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [improving, setImproving] = useState(false);
  const [showAfter, setShowAfter] = useState(false);
  const [afterSections, setAfterSections] = useState<CoverLetterSection[]>([]);

  async function handleAnalyze() {
    if (!coverText.trim()) return;
    setAnalyzing(true);
    setResult(null);
    setShowAfter(false);
    try {
      const res = await analyzeCoverLetter({ coverLetterText: coverText, jobPostingText: jobText || undefined });
      setResult(res);
      setFollowUpAnswers({});
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImprove() {
    if (!result) return;
    setImproving(true);
    try {
      const res = await analyzeCoverLetter({ coverLetterText: coverText, jobPostingText: jobText || undefined, followUpAnswers });
      setAfterSections(res.sections);
      setShowAfter(true);
    } finally {
      setImproving(false);
    }
  }

  const filledAnswers = Object.values(followUpAnswers).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* 입력 영역 */}
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">자기소개서 원문</label>
          <textarea
            value={coverText}
            onChange={(e) => setCoverText(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="자기소개서 전체 내용을 붙여넣어주세요."
          />
          <p className="mt-1 text-right text-xs text-gray-400">{coverText.length}자</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">모집공고 (선택 — 있으면 더 정확한 분석이 가능해요)</label>
          <textarea
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="모집공고를 붙여넣거나 오른쪽 저장한 공고에서 클릭하세요."
          />
          {bookmarks.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {bookmarks.slice(0, 5).map((b) => (
                <button
                  key={b.id}
                  onClick={() => setJobText(`[${b.company_name}] ${b.title}\n${b.posting_url ?? ""}`)}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:border-brand-400 hover:text-brand-600"
                >
                  {b.company_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleAnalyze}
          disabled={!coverText.trim() || analyzing}
          className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
        >
          {analyzing ? "RAG 분석 중..." : "자소서 분석하기"}
        </button>
      </div>

      {/* 분석 결과 */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-sm font-semibold text-gray-700">종합 점수</p>
            <p className={`text-2xl font-bold ${result.overallScore >= 80 ? "text-green-600" : result.overallScore >= 60 ? "text-yellow-600" : "text-red-500"}`}>
              {result.overallScore}점
            </p>
          </div>

          {/* 섹션별 분석 */}
          {!showAfter ? (
            <div className="space-y-3">
              {result.sections.map((s) => (
                <div key={s.key} className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{s.title || SECTION_LABELS[s.key] || s.key}</p>
                    <span className={`text-xs font-bold ${s.score >= 80 ? "text-green-600" : s.score >= 60 ? "text-yellow-600" : "text-red-500"}`}>{s.score}점</span>
                  </div>
                  {s.issues.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-600 mb-1">개선 필요</p>
                      <ul className="space-y-0.5">{s.issues.map((iss, i) => <li key={i} className="text-xs text-gray-600 before:content-['•'] before:mr-1">{iss}</li>)}</ul>
                    </div>
                  )}
                  {s.principles.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-brand-600 mb-1">💡 적용 원칙</p>
                      <ul className="space-y-0.5">{s.principles.map((p, i) => <li key={i} className="text-xs text-gray-500 before:content-['→'] before:mr-1">{p}</li>)}</ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* 비포/애프터 비교 */
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-700">섹션별 개선 전 / 후 비교</p>
              {afterSections.map((s) => (
                <div key={s.key} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700">{s.title || SECTION_LABELS[s.key] || s.key}</div>
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-red-500 mb-1.5">BEFORE</p>
                      <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{s.original}</p>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-semibold text-green-600 mb-1.5">AFTER</p>
                      <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{s.improved || "(개선본 미생성)"}</p>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => setShowAfter(false)} className="text-xs text-gray-400 underline">← 분석 결과로 돌아가기</button>
            </div>
          )}

          {/* 꼬리질문 */}
          {!showAfter && result.followUpQuestions.length > 0 && (
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-brand-700">💬 꼬리질문 — 답변하면 개선본을 만들어드려요</p>
              {result.followUpQuestions.map((fq) => (
                <div key={fq.key}>
                  <p className="text-xs font-medium text-gray-700 mb-1">{fq.question}</p>
                  <textarea
                    value={followUpAnswers[fq.key] ?? ""}
                    onChange={(e) => setFollowUpAnswers((prev) => ({ ...prev, [fq.key]: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-brand-200 bg-white p-2 text-xs focus:border-brand-400 focus:outline-none"
                    placeholder="간단히 답변해주세요."
                  />
                </div>
              ))}
              <button
                onClick={handleImprove}
                disabled={filledAnswers === 0 || improving}
                className="w-full rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
              >
                {improving ? "개선본 생성 중..." : `개선본 생성하기 (${filledAnswers}/${result.followUpQuestions.length} 답변됨)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 탭 3 — 공고별 버전
// ─────────────────────────────────────────────────────────────────────────────
const SECTION_KEYS = ["intro", "motivation", "competency", "growth"] as const;

function VersionsTab({ bookmarks }: { bookmarks: RecruitmentNewsRow[] }) {
  const [versions, setVersions] = useState<StoryBankVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPosting, setNewPosting] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editContent, setEditContent] = useState<Record<string, string>>({});

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try { setVersions((await listStoryBankVersions()).versions); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadVersions(); }, [loadVersions]);

  const selectedVersion = versions.find((v) => v.id === selectedId);

  function openVersion(v: StoryBankVersion) {
    setSelectedId(v.id);
    setEditContent({ ...v.story_content });
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setGenerating(true);
    try {
      const res = await createStoryBankVersion({ versionName: newName, jobPostingText: newPosting || undefined, companyName: newCompany || undefined });
      setVersions((prev) => [res.version, ...prev]);
      openVersion(res.version);
      setCreating(false);
      setNewName(""); setNewPosting(""); setNewCompany("");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    try {
      await updateStoryBankVersion(selectedId, editContent);
      setVersions((prev) => prev.map((v) => v.id === selectedId ? { ...v, story_content: editContent, updated_at: new Date().toISOString() } : v));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 버전을 삭제할까요?")) return;
    await deleteStoryBankVersion(id);
    setVersions((prev) => prev.filter((v) => v.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  if (loading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      {/* 버전 목록 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">모집공고에 최적화된 자소서 버전을 저장·편집하세요.</p>
        <button onClick={() => setCreating(true)} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
          + 새 버전
        </button>
      </div>

      {creating && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-brand-700">새 버전 만들기</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">버전 이름*</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="예: 삼성전자 SW개발" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">회사명</label>
              <input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="예: 삼성전자" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">모집공고 (붙여넣으면 맞춤 초안 생성)</label>
            <textarea value={newPosting} onChange={(e) => setNewPosting(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-200 p-2 text-xs" placeholder="모집공고를 붙여넣거나 아래 저장한 공고를 클릭하세요." />
            {bookmarks.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {bookmarks.slice(0, 6).map((b) => (
                  <button key={b.id} onClick={() => { setNewCompany(b.company_name); setNewPosting(`[${b.company_name}] ${b.title}\n${b.posting_url ?? ""}`); }}
                    className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:border-brand-400 hover:text-brand-600">
                    {b.company_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!newName.trim() || generating}
              className="flex-1 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40">
              {generating ? "RAG로 초안 생성 중..." : "생성하기"}
            </button>
            <button onClick={() => setCreating(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">취소</button>
          </div>
        </div>
      )}

      {versions.length === 0 && !creating && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-400">아직 저장된 버전이 없어요.</p>
          <p className="text-xs text-gray-400 mt-1">스토리 채굴 후 모집공고를 붙여넣으면 AI가 맞춤 자소서를 만들어드려요.</p>
        </div>
      )}

      <div className="grid gap-2">
        {versions.map((v) => (
          <div key={v.id} className={`rounded-xl border-2 cursor-pointer transition-all ${selectedId === v.id ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
            onClick={() => openVersion(v)}>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{v.version_name}</p>
                {v.company_name && <p className="text-xs text-gray-500">{v.company_name} · {new Date(v.updated_at).toLocaleDateString("ko-KR")}</p>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">삭제</button>
            </div>
          </div>
        ))}
      </div>

      {/* 버전 편집기 */}
      {selectedVersion && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">✏️ {selectedVersion.version_name} 편집</p>
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
          {SECTION_KEYS.map((key) => {
            const label = SECTION_LABELS[key];
            const limit = SECTION_CHARS[key] ?? 500;
            const val = editContent[key] ?? "";
            const over = val.length > limit;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">{label}</label>
                  <span className={`text-xs ${over ? "text-red-500 font-bold" : "text-gray-400"}`}>{val.length} / {limit}자</span>
                </div>
                <textarea
                  value={val}
                  onChange={(e) => setEditContent((prev) => ({ ...prev, [key]: e.target.value }))}
                  rows={5}
                  className={`w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-1 ${over ? "border-red-300 focus:border-red-400 focus:ring-red-200" : "border-gray-200 focus:border-brand-500 focus:ring-brand-500"}`}
                />
              </div>
            );
          })}
          <button onClick={handleSave} disabled={saving} className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40">
            {saving ? "저장 중..." : "변경사항 저장"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 메인 — 탭 셸 + 북마크 사이드바
// ─────────────────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: "mining",   label: "스토리 채굴" },
  { id: "cover",    label: "자소서 분석" },
  { id: "versions", label: "공고별 버전" },
];

export default function StoryMiningPage() {
  const [tab, setTab] = useState<Tab>("mining");
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState<RecruitmentNewsRow[]>([]);

  useEffect(() => {
    listBookmarks().then((r) => setBookmarks(r.news)).catch(() => {});
  }, []);

  return (
    <div className="relative">
      <div className="flex items-start gap-6">
        {/* 메인 컨텐츠 */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">스토리뱅크</h1>
            <button
              onClick={() => setShowBookmarks((s) => !s)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${showBookmarks ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
            >
              <span>📌</span>
              저장한 공고 {bookmarks.length > 0 && `(${bookmarks.length})`}
            </button>
          </div>

          {/* 탭 */}
          <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "mining"   && <MiningTab />}
          {tab === "cover"    && <CoverLetterTab bookmarks={bookmarks} />}
          {tab === "versions" && <VersionsTab bookmarks={bookmarks} />}
        </div>

        {/* 북마크 사이드바 */}
        {showBookmarks && (
          <aside className="w-64 shrink-0 rounded-xl border border-gray-200 bg-white p-3 sticky top-4 max-h-[80vh] overflow-y-auto">
            <p className="text-xs font-semibold text-gray-700 mb-2">📌 저장한 공고</p>
            {bookmarks.length === 0 ? (
              <p className="text-xs text-gray-400">저장한 공고가 없어요.</p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((b) => (
                  <div key={b.id} className="rounded-lg border border-gray-100 p-2">
                    <p className="text-xs font-medium text-gray-800 leading-tight">{b.company_name}</p>
                    <p className="text-[11px] text-gray-500 leading-tight mt-0.5 line-clamp-2">{b.title}</p>
                    {b.posting_url && (
                      <a href={b.posting_url} target="_blank" rel="noreferrer" className="mt-1 text-[10px] text-brand-600 hover:underline block">원문 보기 →</a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
