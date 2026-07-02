import { useEffect, useRef, useState } from "react";
import ChatBubble from "../components/feature/ChatBubble";
import { startStoryMining, continueStoryMining } from "../api/endpoints";
import type { StoryCardRow } from "../../shared/types";

interface Turn {
  question: string;
  answer?: string;
}

const OPENING = "지금부터 당신의 경험에서 10개의 '진짜 이야기'를 꺼낼 거예요. 완성된 문장으로 말하지 않아도 괜찮습니다. 기억나는 대로 편하게 이야기해주세요.";

export default function StoryMiningPage() {
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

  useEffect(() => {
    startStoryMining().then((res) => {
      setSessionId(res.sessionId);
      setSlotName(res.slotName ?? null);
      setSlotIndex(res.slotIndex ?? 0);
      setTurns([{ question: res.question ?? "" }]);
      setLoading(false);
    });
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

    setTurns((prev) => {
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], answer };
      return next;
    });

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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-fadeUp">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">스토리뱅크 채굴</h1>
        <p className="mt-1 text-sm text-gray-500">{OPENING}</p>
      </div>

      {!done && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{slotName}</span>
            <span>{slotIndex + 1} / 10</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200">
            <div
              className="h-1.5 rounded-full bg-brand-500 transition-all"
              style={{ width: `${((slotIndex + 1) / 10) * 100}%` }}
            />
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
        {checkpointNote && (
          <p className="text-center text-xs text-gray-400 italic px-4">{checkpointNote}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {!done && (
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={3}
            disabled={submitting}
            className="flex-1 rounded-xl border border-gray-200 bg-white p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
            placeholder="편하게 그때 상황을 얘기하듯 말씀해주세요."
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || submitting}
            className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 transition-colors"
          >
            {submitting ? "..." : "전송"}
          </button>
        </div>
      )}

      {done && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4 text-center">
          <p className="text-lg font-semibold text-gray-900">10개 스토리 채굴 완료!</p>
          <p className="text-sm text-gray-500">
            {cards.length}개의 스토리 카드가 마이페이지에 저장됐어요. AI 모의면접에서 이 스토리들을 활용할 수 있어요.
          </p>
          <a
            href="/mypage"
            className="inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            마이페이지에서 확인하기
          </a>
        </div>
      )}
    </div>
  );
}
