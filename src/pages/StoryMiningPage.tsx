import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import ChatBubble from "../components/feature/ChatBubble";
import {
  startStoryMining, continueStoryMining, skipStoryMining, editStoryCard, createStoryCardDirect, upgradeStoryCard,
  getActiveStoryMiningSession, listStoryCards,
  listStoryBankVersions, createStoryBankVersion, updateStoryBankVersion, deleteStoryBankVersion,
  analyzeCoverLetter, listBookmarks
} from "../api/endpoints";
import type { StoryCardRow, StoryBankVersion, RecruitmentNewsRow, CoverLetterSection, SlotId } from "../../shared/types";

type Tab = "mining" | "cover" | "versions";

interface Turn { question: string; answer?: string }

const SECTION_LABELS: Record<string, string> = {
  intro: "자기소개", motivation: "지원동기", competency: "직무역량", growth: "성장계획", full: "전체", other: "기타"
};
const SECTION_CHARS: Record<string, number> = {
  intro: 600, motivation: 600, competency: 500, growth: 400, full: 800, other: 500
};

const SLOT_NAMES: Record<string, string> = {
  S01: "입문/전환", S02: "실패·좌절", S03: "갈등·이견",
  S04: "주도·이니셔티브", S05: "압박·마감", S06: "숫자/성과",
  S07: "학습·전환", S08: "리더십/영향력", S09: "가치관 충돌", S10: "미래연결"
};
const ALL_SLOTS: SlotId[] = ["S01","S02","S03","S04","S05","S06","S07","S08","S09","S10"];

const MODULE_LABELS: Record<string, string> = {
  situation: "상황", friction: "문제", action: "행동",
  result_quant: "수치결과", result_qual: "질적결과", reflection: "교훈"
};

const JOB_CATEGORIES = ["전체", "마케팅", "인사/HR", "IT/개발", "영업", "기획", "재무/회계", "디자인", "기타"];

const OPENING = "지금부터 당신의 경험에서 10개의 '진짜 이야기'를 꺼낼 거예요. 완성된 문장으로 말하지 않아도 괜찮습니다.";

// 슬롯별 사전 정의 질문 목록 (opening + followup 순서)
const SLOT_QUESTIONS: Record<SlotId, string[]> = {
  S01: [
    "지금 하고 계신 일이나 관심 분야를 처음 시작하게 된 계기, 그 순간이 언제였나요?",
    "그게 언제, 어떤 상황에서였나요? 그때 뭘 하고 계셨어요?",
    "그 전까지는 뭘 하려고 했었나요? 방향을 바꾼 이유가 된 구체적인 사건이 있었나요?",
    "그렇게 마음먹은 뒤 처음으로 실제로 한 행동은 뭐였어요?",
    "그 결과를 숫자나 눈에 보이는 변화로 표현하면 어떻게 되나요?",
    "그 경험이 지금 당신이 일하는 방식에 남긴 원칙이 하나 있다면요?"
  ],
  S02: [
    "일하면서(또는 프로젝트하면서) 가장 크게 좌절했던 순간, 혹은 '내가 틀렸다'고 인정해야 했던 순간이 있었나요?",
    "그게 언제, 어떤 상황에서였는지 조금 더 구체적으로 말씀해주시겠어요?",
    "그때 본인이 놓쳤던 부분, 혹은 다르게 판단했으면 좋았을 부분이 있었을까요?",
    "그 상황에서 상황을 바꾸기 위해 처음 시도한 게 뭐였어요?",
    "그 결과를 숫자나 눈에 보이는 변화로 표현하면 어떻게 되나요?",
    "그 이후 관계나 태도, 신뢰 측면에서 달라진 점이 있나요?"
  ],
  S03: [
    "팀원이나 상사, 파트너와 의견이 부딪혔던 순간이 있었나요? 어떻게 풀었나요?",
    "그게 언제, 어떤 상황에서였는지 조금 더 구체적으로 말씀해주시겠어요?",
    "구체적으로 무엇에 대해 서로 다른 입장이었나요? 그 사람 입장에서는 왜 그렇게 생각했을까요?",
    "그 이견을 좁히기 위해 실제로 어떤 대화나 행동을 하셨나요?",
    "그 결과를 숫자나 눈에 보이는 변화로 표현하면 어떻게 되나요?",
    "결국 어떻게 정리됐고, 그 사람과의 관계는 그 후 어땠나요?"
  ],
  S04: [
    "누가 시키지 않았는데 스스로 만들어낸 결과물이나 변화가 있었나요?",
    "그걸 시작하기 전, 어떤 문제나 불편함을 먼저 발견하셨나요?",
    "그게 구체적으로 어떤 문제나 장애물이었나요?",
    "그 상황에서 실제로 어떤 행동을 하셨는지 말씀해주시겠어요?",
    "그 결과로 무엇이 몇 % 나아졌다거나, 시간이 얼마나 줄었다거나 하는 게 있었나요?",
    "그 경험에서 얻은 원칙이나 기준이 있다면 한 문장으로 말씀해주시겠어요?"
  ],
  S05: [
    "시간이나 자원이 절대적으로 부족한 상황에서 뭔가를 해내야 했던 순간이 있었나요?",
    "그게 언제, 어떤 상황에서였는지 조금 더 구체적으로 말씀해주시겠어요?",
    "그때 구체적으로 무엇이 어려웠거나 걸림돌이었나요?",
    "그 안에서 무엇을 포기하고 무엇을 먼저 했는지, 그 선택의 기준이 뭐였나요?",
    "그 결과를 숫자나 눈에 보이는 변화로 표현하면 어떻게 되나요?",
    "그 경험 이후로 마감이 급할 때 지금은 어떻게 다르게 접근하세요?"
  ],
  S06: [
    "숫자로 증명할 수 있는, 본인이 가장 자신 있는 성과 하나만 말씀해주세요.",
    "그게 언제, 어떤 상황에서였는지 조금 더 구체적으로 말씀해주시겠어요?",
    "그때 구체적으로 무엇이 어려웠거나 걸림돌이었나요?",
    "그 숫자를 만들기 위해 구체적으로 어떤 걸 바꾸셨나요?",
    "그게 이전과 비교해서 대략 몇 배, 몇 %, 얼마의 기간이었나요?",
    "그 이후 관계나 태도, 신뢰 측면에서 달라진 점이 있나요?"
  ],
  S07: [
    "완전히 모르는 걸 짧은 시간 안에 배워서 써먹어야 했던 순간이 있었나요?",
    "그게 언제, 어떤 상황에서였는지 조금 더 구체적으로 말씀해주시겠어요?",
    "그때 구체적으로 무엇이 어려웠거나 걸림돌이었나요?",
    "구체적으로 어떤 자료/방법으로 배우셨어요? 막혔던 지점은 어떻게 뚫으셨나요?",
    "그 결과를 숫자나 눈에 보이는 변화로 표현하면 어떻게 되나요?",
    "그걸 배운 이후로 그 지식을 다른 상황에도 써본 적이 있나요?"
  ],
  S08: [
    "직급이나 역할과 관계없이, 다른 사람을 움직이게 하거나 설득해야 했던 순간이 있었나요?",
    "그게 언제, 어떤 상황에서였는지 조금 더 구체적으로 말씀해주시겠어요?",
    "왜 다들 꺼려했을까요? 그 사람들 입장에서의 이유가 뭐였을까요?",
    "그 사람들을 움직이기 위해 논리로 설득했나요, 먼저 행동으로 보여줬나요, 아니면 다른 방법이었나요?",
    "그 결과를 숫자나 눈에 보이는 변화로 표현하면 어떻게 되나요?",
    "그 경험에서 얻은 원칙이나 기준이 있다면 한 문장으로 말씀해주시겠어요?"
  ],
  S09: [
    "효율이나 결과를 위해 원칙을 조금 굽힐 수 있었던 상황에서, 오히려 원칙을 지켰던(또는 지키지 못했던) 순간이 있었나요?",
    "그게 언제, 어떤 상황에서였는지 조금 더 구체적으로 말씀해주시겠어요?",
    "그 순간 조금이라도 흔들렸던 지점이 있었을 것 같은데, 뭐였나요?",
    "그 상황에서 실제로 어떤 행동을 하셨는지 말씀해주시겠어요?",
    "그 결과를 숫자나 눈에 보이는 변화로 표현하면 어떻게 되나요?",
    "그 경험에서 얻은 원칙이나 기준이 있다면 한 문장으로 말씀해주시겠어요?"
  ],
  S10: [
    "지금까지의 이야기들이 지원하려는 직무/회사와 어떻게 이어진다고 생각하세요?",
    "그게 언제, 어떤 상황에서였는지 조금 더 구체적으로 말씀해주시겠어요?",
    "그때 구체적으로 무엇이 어려웠거나 걸림돌이었나요?",
    "그 상황에서 실제로 어떤 행동을 하셨는지 말씀해주시겠어요?",
    "그 결과를 숫자나 눈에 보이는 변화로 표현하면 어떻게 되나요?",
    "지금까지 나온 이야기들의 공통점이 이 회사/직무에서는 구체적으로 어떤 상황에 쓰일 것 같나요?"
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// 슬롯 완성도 미니 뷰
// ─────────────────────────────────────────────────────────────────────────────
function ModuleDots({ modules }: { modules: Record<string, boolean> }) {
  return (
    <div className="flex gap-0.5 mt-1">
      {Object.entries(MODULE_LABELS).map(([key, label]) => (
        <div key={key} title={label}
          className={`h-2 w-2 rounded-full ${modules[key] ? "bg-brand-500" : "bg-gray-200"}`} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 탭 1 — 스토리 채굴 (Overview → Slot Detail → Mining Session)
// ─────────────────────────────────────────────────────────────────────────────
type MiningView = "overview" | "session" | "edit";

interface UpgradeDialog {
  type: "single" | "all";
  targetIndex?: number;
}

function MiningTab() {
  // 공통
  const [cards, setCards] = useState<StoryCardRow[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [view, setView] = useState<MiningView>("overview");
  const [selectedSlot, setSelectedSlot] = useState<SlotId | null>(null);

  // 세션 상태
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [slotName, setSlotName] = useState<string | null>(null);
  const [slotIndex, setSlotIndex] = useState(0);
  const [checkpointNote, setCheckpointNote] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sessionLoading, setSessionLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 편집 상태
  const [editCard, setEditCard] = useState<StoryCardRow | null>(null);
  const [editAnswers, setEditAnswers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // AI 업그레이드 상태
  const [upgradeDialog, setUpgradeDialog] = useState<UpgradeDialog | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradingIndex, setUpgradingIndex] = useState<number | null>(null);
  // 항목별 개선 제안: index → { before, after, reason } — 수락/거절 대기
  const [pendingUpgrades, setPendingUpgrades] = useState<Record<number, { before: string; after: string; reason: string }>>({});

  // 카드 로드
  const loadCards = useCallback(async () => {
    setCardsLoading(true);
    const res = await listStoryCards();
    setCards(res.cards);
    setCardsLoading(false);
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  useEffect(() => {
    if (view === "session") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, submitting, view]);

  // 세션 시작/재개
  async function startSession(fromSlot?: number) {
    setSessionLoading(true);
    setView("session");
    setDone(false);
    setInput("");
    setTurns([]);
    try {
      // 기존 세션 재개 시도
      const active = await getActiveStoryMiningSession();
      if (active.session && active.session.transcript.length > 0 && fromSlot === undefined) {
        setSessionId(active.session.sessionId);
        setSlotName(active.session.slotName);
        setSlotIndex(active.session.slotIndex);
        setTurns(active.session.transcript.map((t) => ({ question: t.question, answer: t.answer || undefined })));
      } else {
        const res = await startStoryMining();
        setSessionId(res.sessionId);
        setSlotName(res.slotName ?? null);
        setSlotIndex(res.slotIndex ?? 0);
        setTurns([{ question: res.question ?? "" }]);
        setCheckpointNote(null);
      }
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleSubmit() {
    if (!input.trim() || !sessionId || submitting) return;
    const answer = input.trim();
    setInput("");
    setSubmitting(true);
    setCheckpointNote(null);
    setTurns((prev) => { const n = [...prev]; n[n.length - 1] = { ...n[n.length - 1], answer }; return n; });
    try {
      const res = await continueStoryMining(sessionId, answer);
      if (res.lastCard) setCards((prev) => {
        const filtered = prev.filter((c) => c.slot_id !== res.lastCard!.slot_id);
        return [...filtered, res.lastCard!];
      });
      if (res.done) {
        setDone(true);
        loadCards();
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

  async function handleSkip() {
    if (!sessionId || skipping) return;
    setSkipping(true);
    setCheckpointNote(null);
    try {
      const res = await skipStoryMining(sessionId);
      if (res.done) {
        setDone(true);
        loadCards();
      } else {
        setSlotName(res.slotName ?? null);
        setSlotIndex(res.slotIndex ?? slotIndex + 1);
        setCheckpointNote(res.checkpointNote ?? null);
        setTurns([{ question: res.question ?? "" }]);
      }
    } finally {
      setSkipping(false);
    }
  }

  // 편집 모드 — 채굴된 카드(card)든 미채굴 슬롯(slotId만)이든 열 수 있다
  function openEdit(slotId: SlotId, card: StoryCardRow | null) {
    setSelectedSlot(slotId);
    setEditCard(card);
    const questions = SLOT_QUESTIONS[slotId] ?? [];
    if (card) {
      // 기존 답변을 질문 개수만큼 패딩, 초과분은 마지막에 추가
      const padded = questions.map((_, i) => card.raw_answers[i] ?? "");
      const extras = card.raw_answers.slice(questions.length);
      setEditAnswers([...padded, ...extras]);
    } else {
      setEditAnswers(questions.map(() => ""));
    }
    setView("edit");
    setUpgradeDialog(null);
    setPendingUpgrades({});
  }

  async function handleSaveEdit() {
    if (!selectedSlot) return;
    setSaving(true);
    try {
      if (editCard) {
        await editStoryCard(editCard.id, editAnswers);
        setCards((prev) => prev.map((c) => c.id === editCard.id ? { ...c, raw_answers: editAnswers } : c));
      } else {
        // 미채굴 슬롯 직접 기입 → 카드 신규 생성
        const res = await createStoryCardDirect(selectedSlot, editAnswers);
        setCards((prev) => [...prev.filter((c) => c.slot_id !== selectedSlot), res.card]);
      }
      setView("overview");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpgrade() {
    if (!selectedSlot || !upgradeDialog) return;
    const questions = SLOT_QUESTIONS[selectedSlot] ?? [];
    setUpgrading(true);
    if (upgradeDialog.type === "single" && upgradeDialog.targetIndex !== undefined) {
      setUpgradingIndex(upgradeDialog.targetIndex);
    }
    setUpgradeDialog(null);
    try {
      const res = await upgradeStoryCard({
        slotName: editCard?.slot_name ?? SLOT_NAMES[selectedSlot],
        questions,
        answers: editAnswers,
        ...(upgradeDialog.type === "single" ? { targetIndex: upgradeDialog.targetIndex } : {})
      });
      // 바로 덮어쓰지 않고, 바뀐 항목만 비포/애프터 수락 대기 상태로 쌓는다
      setPendingUpgrades((prev) => {
        const next = { ...prev };
        res.upgraded.forEach((u, i) => {
          const before = editAnswers[i] ?? "";
          if (u.text && u.text !== before) {
            next[i] = { before, after: u.text, reason: u.reason };
          }
        });
        return next;
      });
    } finally {
      setUpgrading(false);
      setUpgradingIndex(null);
    }
  }

  function acceptUpgrade(index: number) {
    const pending = pendingUpgrades[index];
    if (!pending) return;
    setEditAnswers((prev) => {
      const next = [...prev];
      while (next.length <= index) next.push("");
      next[index] = pending.after;
      return next;
    });
    setPendingUpgrades((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  function rejectUpgrade(index: number) {
    setPendingUpgrades((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }

  // ── 개요 화면 ────────────────────────────────────────────────────────────
  const cardMap = Object.fromEntries(cards.map((c) => [c.slot_id, c]));
  const filledCount = cards.length;

  if (view === "overview") {
    return (
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">
              {filledCount}/10 슬롯 채굴됨
            </p>
            <p className="text-xs text-gray-400 mt-0.5">슬롯을 클릭해 기록을 보거나 편집하세요.</p>
          </div>
          <button
            onClick={() => startSession()}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            {filledCount > 0 ? "이어서 채굴" : "채굴 시작"}
          </button>
        </div>

        {/* 완성도 바 */}
        <div>
          <div className="h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-brand-500 transition-all"
              style={{ width: `${(filledCount / 10) * 100}%` }} />
          </div>
        </div>

        {/* 10개 슬롯 그리드 */}
        {cardsLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {ALL_SLOTS.map((slotId, i) => {
              const card = cardMap[slotId];
              const filled = card != null;
              const complete = card?.status === "slot_complete";
              const pct = card ? Math.round(
                (Object.values(card.modules_filled).filter(Boolean).length / 6) * 100
              ) : 0;

              return (
                <div key={slotId}
                  onClick={() => openEdit(slotId, card ?? null)}
                  className={`rounded-xl border-2 p-3 transition-all cursor-pointer ${
                    filled
                      ? complete
                        ? "border-brand-300 bg-brand-50 hover:border-brand-500"
                        : "border-amber-200 bg-amber-50 hover:border-amber-400"
                      : "border-dashed border-gray-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{slotId}</span>
                    {filled && (
                      <span className={`text-[10px] font-bold ${complete ? "text-brand-600" : "text-amber-600"}`}>
                        {complete ? "완성" : `${pct}%`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-800 mt-1 leading-snug">
                    {i + 1}. {SLOT_NAMES[slotId]}
                  </p>
                  {filled ? (
                    <ModuleDots modules={card.modules_filled} />
                  ) : (
                    <p className="text-[10px] text-gray-400 mt-1.5">미채굴 · 클릭해서 바로 작성</p>
                  )}
                  {filled && (
                    <p className="mt-1.5 text-[11px] text-gray-500 line-clamp-2 leading-snug">
                      {card.raw_answers[0]?.slice(0, 60) ?? ""}…
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 범례 */}
        <div className="flex gap-4 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-brand-500" />모듈 채워짐</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gray-200" />미수집</span>
          <span className="text-[11px] text-gray-400">클릭 → 편집</span>
        </div>
      </div>
    );
  }

  // ── 편집 화면 ────────────────────────────────────────────────────────────
  if (view === "edit" && selectedSlot) {
    const slotQs = SLOT_QUESTIONS[selectedSlot] ?? [];
    const totalItems = Math.max(slotQs.length, editAnswers.length);

    return (
      <div className="space-y-4">
        {/* 확인 다이얼로그 */}
        {upgradeDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-3">
              <p className="text-sm font-bold text-gray-900">
                {upgradeDialog.type === "all" ? "✨ 전체 AI 업그레이드" : "✨ AI 업그레이드"}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                답변을 자동 개선합니다.<br />
                <span className="text-amber-600 font-medium">⚠️ AI 환각(hallucination)이 발생할 수 있습니다.</span><br />
                개선안을 비교해 보고 직접 수락/거절할 수 있어요.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setUpgradeDialog(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-500 hover:bg-gray-50">
                  진행 안함
                </button>
                <button onClick={handleUpgrade}
                  className="flex-1 rounded-xl bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600">
                  진행
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button onClick={() => setView("overview")}
            className="text-xs text-gray-400 hover:text-gray-600">← 목록</button>
          <h3 className="text-sm font-bold text-gray-900">
            {editCard?.slot_name ?? SLOT_NAMES[selectedSlot]} 편집
          </h3>
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
            editCard
              ? editCard.status === "slot_complete" ? "bg-brand-100 text-brand-700" : "bg-amber-100 text-amber-700"
              : "bg-gray-100 text-gray-500"
          }`}>
            {editCard ? (editCard.status === "slot_complete" ? "완성" : "부분 채굴") : "새로 작성"}
          </span>
        </div>

        {/* 모듈 채움 현황 (기존 카드일 때만) */}
        {editCard && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(MODULE_LABELS).map(([key, label]) => (
              <span key={key} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                editCard.modules_filled[key as keyof typeof editCard.modules_filled]
                  ? "bg-brand-100 text-brand-700"
                  : "bg-gray-100 text-gray-400"
              }`}>
                {editCard.modules_filled[key as keyof typeof editCard.modules_filled] ? "✓" : "○"} {label}
              </span>
            ))}
          </div>
        )}

        {/* 질문+답변 카드 목록 */}
        <div className="space-y-3">
          {Array.from({ length: totalItems }).map((_, i) => {
            const question = slotQs[i] ?? `추가 답변 ${i - slotQs.length + 1}`;
            const ans = editAnswers[i] ?? "";
            const isUpgradingThis = upgrading && upgradingIndex === i;
            const isUpgradingAll = upgrading && upgradingIndex === null;
            const pending = pendingUpgrades[i];
            return (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-brand-700 leading-snug flex-1">Q{i + 1}. {question}</p>
                  {!pending && (
                    <button
                      onClick={() => setUpgradeDialog({ type: "single", targetIndex: i })}
                      disabled={upgrading}
                      className="shrink-0 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-40 transition-colors"
                    >
                      {isUpgradingThis ? "업그레이드 중..." : "✨ AI"}
                    </button>
                  )}
                </div>

                {pending ? (
                  /* 비포/애프터 비교 — 수락/거절 */
                  <div className="space-y-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">현재 답변</p>
                      <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{pending.before || "(비어 있음)"}</p>
                    </div>
                    <div className="rounded-lg border-2 border-brand-300 bg-brand-50 p-2.5">
                      <p className="text-[10px] font-bold text-brand-600 mb-1">✨ AI 개선안</p>
                      <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{pending.after}</p>
                    </div>
                    {pending.reason && (
                      <div className="rounded-lg bg-blue-50 border border-blue-100 p-2.5">
                        <p className="text-[10px] font-bold text-blue-600 mb-1">💡 이렇게 바꾼 이유</p>
                        <p className="text-xs text-blue-800 leading-relaxed">{pending.reason}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => rejectUpgrade(i)}
                        className="flex-1 rounded-lg border border-gray-200 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
                        ✗ 기존 답변 유지
                      </button>
                      <button onClick={() => acceptUpgrade(i)}
                        className="flex-1 rounded-lg bg-brand-500 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
                        ✓ 개선안 적용
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      {(isUpgradingThis || isUpgradingAll) && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-purple-50/80 z-10">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
                        </div>
                      )}
                      <textarea
                        value={ans}
                        onChange={(e) => {
                          const next = [...editAnswers];
                          while (next.length <= i) next.push("");
                          next[i] = e.target.value;
                          setEditAnswers(next);
                        }}
                        rows={3}
                        disabled={upgrading}
                        className="w-full rounded-lg border border-gray-200 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
                        placeholder={`${question}에 대한 답변을 입력하세요.`}
                      />
                    </div>
                    <p className="text-right text-[10px] text-gray-300">{ans.length}자</p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* 하단 버튼 */}
        <button
          onClick={() => setUpgradeDialog({ type: "all" })}
          disabled={upgrading}
          className="w-full rounded-xl border border-purple-300 bg-purple-50 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
        >
          {upgrading && upgradingIndex === null
            ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" /> 전체 업그레이드 중...</>
            : "✨ 전체 AI 업그레이드"
          }
        </button>

        {Object.keys(pendingUpgrades).length > 0 && (
          <p className="text-xs text-amber-600 text-center">
            ⚠️ 수락/거절을 기다리는 개선안이 {Object.keys(pendingUpgrades).length}개 있어요. 결정 후 저장하세요.
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={() => setView("overview")}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50">
            취소
          </button>
          <button onClick={handleSaveEdit} disabled={saving || upgrading || Object.keys(pendingUpgrades).length > 0}
            className="flex-1 rounded-xl bg-brand-500 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40">
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </div>
    );
  }

  // ── 채굴 세션 화면 ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{OPENING}</p>
          <p className="mt-0.5 text-xs text-gray-400">대화는 자동 저장돼요. 언제든 나갔다가 이어서 진행할 수 있어요.</p>
        </div>
        <button onClick={() => setView("overview")}
          className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
          ← 목록으로
        </button>
      </div>

      {!done && !sessionLoading && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="font-medium text-brand-700">{slotName}</span>
            <span>{slotIndex + 1} / 10</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200">
            <div className="h-1.5 rounded-full bg-brand-500 transition-all"
              style={{ width: `${((slotIndex + 1) / 10) * 100}%` }} />
          </div>
        </div>
      )}

      {sessionLoading ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
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
      )}

      {!done && !sessionLoading && (
        <div className="space-y-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            rows={3}
            disabled={submitting || skipping}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
            placeholder="편하게 그때 상황을 얘기하듯 말씀해주세요. (Enter로 전송)"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400">{input.length}자</span>
            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                disabled={submitting || skipping || !sessionId}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                {skipping ? "..." : "건너뛰기"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || submitting || skipping}
                className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
              >
                {submitting ? "..." : "전송"}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400">💡 지금 답변이 어려우면 <span className="font-medium">건너뛰기</span>로 다음 질문으로 넘어가고 나중에 편집할 수 있어요.</p>
        </div>
      )}

      {done && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 text-center">
          <p className="text-lg font-semibold text-gray-900">채굴 완료! 🎉</p>
          <p className="text-sm text-gray-500">채굴한 스토리를 확인하고 편집하세요.</p>
          <button onClick={() => setView("overview")}
            className="inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            스토리 목록 보기
          </button>
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
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">자기소개서 원문</label>
          <textarea value={coverText} onChange={(e) => setCoverText(e.target.value)} rows={8}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="자기소개서 전체 내용을 붙여넣어주세요." />
          <p className="mt-1 text-right text-xs text-gray-400">{coverText.length}자</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">모집공고 (선택)</label>
          <textarea value={jobText} onChange={(e) => setJobText(e.target.value)} rows={3}
            className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            placeholder="모집공고를 붙여넣거나 오른쪽 저장한 공고에서 클릭하세요." />
          {bookmarks.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {bookmarks.slice(0, 5).map((b) => (
                <button key={b.id}
                  onClick={() => setJobText(`[${b.company_name}] ${b.title}\n${b.posting_url ?? ""}`)}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:border-brand-400 hover:text-brand-600">
                  {b.company_name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={handleAnalyze} disabled={!coverText.trim() || analyzing}
          className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors">
          {analyzing ? "RAG 분석 중..." : "자소서 분석하기"}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
            <p className="text-sm font-semibold text-gray-700">종합 점수</p>
            <p className={`text-2xl font-bold ${result.overallScore >= 80 ? "text-green-600" : result.overallScore >= 60 ? "text-yellow-600" : "text-red-500"}`}>
              {result.overallScore}점
            </p>
          </div>

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

          {!showAfter && result.followUpQuestions.length > 0 && (
            <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-brand-700">💬 꼬리질문 — 답변하면 개선본을 만들어드려요</p>
              {result.followUpQuestions.map((fq) => (
                <div key={fq.key}>
                  <p className="text-xs font-medium text-gray-700 mb-1">{fq.question}</p>
                  <textarea value={followUpAnswers[fq.key] ?? ""}
                    onChange={(e) => setFollowUpAnswers((prev) => ({ ...prev, [fq.key]: e.target.value }))}
                    rows={2} className="w-full rounded-lg border border-brand-200 bg-white p-2 text-xs focus:border-brand-400 focus:outline-none"
                    placeholder="간단히 답변해주세요." />
                </div>
              ))}
              <button onClick={handleImprove} disabled={filledAnswers === 0 || improving}
                className="w-full rounded-lg bg-brand-500 py-2 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors">
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
// 탭 3 — 공고별 버전 (직무 카테고리 분류 추가)
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
  const [newCategory, setNewCategory] = useState("전체");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [filterCat, setFilterCat] = useState("전체");

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
      const res = await createStoryBankVersion({
        versionName: newName,
        jobPostingText: newPosting || undefined,
        companyName: newCompany || undefined
      });
      // 카테고리를 story_content._category에 저장
      const withCat = { ...res.version, story_content: { ...res.version.story_content, _category: newCategory } };
      setVersions((prev) => [withCat, ...prev]);
      openVersion(withCat);
      setEditContent({ ...withCat.story_content });
      setCreating(false);
      setNewName(""); setNewPosting(""); setNewCompany(""); setNewCategory("전체");
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

  const usedCats = Array.from(new Set(versions.map((v) => v.story_content._category ?? "기타")));
  const filtered = filterCat === "전체" ? versions : versions.filter((v) => (v.story_content._category ?? "기타") === filterCat);

  if (loading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">모집공고에 최적화된 자소서 버전을 저장·편집하세요.</p>
        <button onClick={() => setCreating(true)} className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600">
          + 새 버전
        </button>
      </div>

      {/* 직무 카테고리 필터 */}
      {versions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {["전체", ...usedCats.filter((c) => c !== "전체")].map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filterCat === cat ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-500 hover:border-gray-300"}`}>
              {cat} {cat === "전체" ? `(${versions.length})` : `(${versions.filter((v) => (v.story_content._category ?? "기타") === cat).length})`}
            </button>
          ))}
        </div>
      )}

      {creating && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-brand-700">새 버전 만들기</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">버전 이름*</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="예: 삼성전자 SW개발" />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">회사명</label>
              <input value={newCompany} onChange={(e) => setNewCompany(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="예: 삼성전자" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">직무 분야</label>
            <div className="flex flex-wrap gap-1.5">
              {JOB_CATEGORIES.filter((c) => c !== "전체").map((cat) => (
                <button key={cat} onClick={() => setNewCategory(cat)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${newCategory === cat ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600 hover:border-brand-400"}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">모집공고 (붙여넣으면 맞춤 초안 생성)</label>
            <textarea value={newPosting} onChange={(e) => setNewPosting(e.target.value)} rows={3}
              className="w-full rounded-lg border border-gray-200 p-2 text-xs"
              placeholder="모집공고를 붙여넣거나 아래 저장한 공고를 클릭하세요." />
            {bookmarks.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {bookmarks.slice(0, 6).map((b) => (
                  <button key={b.id}
                    onClick={() => { setNewCompany(b.company_name); setNewPosting(`[${b.company_name}] ${b.title}\n${b.posting_url ?? ""}`); }}
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

      {filtered.length === 0 && !creating && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center">
          <p className="text-sm text-gray-400">아직 저장된 버전이 없어요.</p>
          <p className="text-xs text-gray-400 mt-1">스토리 채굴 후 모집공고를 붙여넣으면 AI가 맞춤 자소서를 만들어드려요.</p>
        </div>
      )}

      <div className="grid gap-2">
        {filtered.map((v) => {
          const cat = v.story_content._category;
          return (
            <div key={v.id} className={`rounded-xl border-2 cursor-pointer transition-all ${selectedId === v.id ? "border-brand-500 bg-brand-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
              onClick={() => openVersion(v)}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{v.version_name}</p>
                    {cat && cat !== "전체" && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">{cat}</span>
                    )}
                  </div>
                  {v.company_name && <p className="text-xs text-gray-500">{v.company_name} · {new Date(v.updated_at).toLocaleDateString("ko-KR")}</p>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}
                  className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 shrink-0">삭제</button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedVersion && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">✏️ {selectedVersion.version_name} 편집</p>
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-40">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
          {/* 직무 카테고리 편집 */}
          <div>
            <label className="text-xs text-gray-600 mb-1.5 block">직무 분야</label>
            <div className="flex flex-wrap gap-1.5">
              {JOB_CATEGORIES.filter((c) => c !== "전체").map((cat) => (
                <button key={cat}
                  onClick={() => setEditContent((prev) => ({ ...prev, _category: cat }))}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${(editContent._category ?? "기타") === cat ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600 hover:border-brand-400"}`}>
                  {cat}
                </button>
              ))}
            </div>
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
                <textarea value={val} onChange={(e) => setEditContent((prev) => ({ ...prev, [key]: e.target.value }))} rows={5}
                  className={`w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-1 ${over ? "border-red-300 focus:border-red-400 focus:ring-red-200" : "border-gray-200 focus:border-brand-500 focus:ring-brand-500"}`} />
              </div>
            );
          })}
          <button onClick={handleSave} disabled={saving}
            className="w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40">
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
  { id: "cover",    label: "자소서 분석" },
  { id: "versions", label: "공고별 버전" },
  { id: "mining",   label: "스토리 채굴" },
];

export default function StoryMiningPage() {
  const [tab, setTab] = useState<Tab>("cover");
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState<RecruitmentNewsRow[]>([]);

  useEffect(() => {
    listBookmarks().then((r) => setBookmarks(r.news)).catch(() => {});
  }, []);

  return (
    <div className="relative">
      <div className="flex items-start gap-6">
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

          <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "mining"   && <MiningTab />}
          {tab === "cover"    && <CoverLetterTab bookmarks={bookmarks} />}
          {tab === "versions" && <VersionsTab bookmarks={bookmarks} />}
        </div>

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
                      <a href={b.posting_url} target="_blank" rel="noreferrer"
                        className="mt-1 text-[10px] text-brand-600 hover:underline block">원문 보기 →</a>
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
