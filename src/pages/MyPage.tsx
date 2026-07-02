import { useEffect, useState } from "react";
import { useCredits } from "../context/CreditContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { listStoryCards } from "../api/endpoints";
import type { StoryCardRow } from "../../shared/types";

const CREDIT_PACKS = [
  { credits: 5, price: 4900 },
  { credits: 10, price: 8900 }
];

export default function MyPage() {
  const { credits, planTier, loading: creditsLoading, charge } = useCredits();
  const [cards, setCards] = useState<StoryCardRow[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    listStoryCards()
      .then((res) => setCards(res.cards))
      .finally(() => setCardsLoading(false));
  }, []);

  return (
    <div className="max-w-2xl space-y-8 animate-fadeUp">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">마이페이지</h1>
        <p className="mt-1 text-sm text-gray-500">모의면접 크레딧을 관리하세요.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">현재 플랜</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{planTier}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">남은 크레딧</p>
            {creditsLoading ? (
              <LoadingSpinner />
            ) : (
              <p className="text-3xl font-bold text-brand-500">{credits}<span className="text-sm text-gray-400 ml-1">회</span></p>
            )}
          </div>
        </div>

        <div className="h-3 rounded-full bg-gray-100">
          <div
            className="h-3 rounded-full bg-brand-500 transition-all"
            style={{ width: `${Math.min(100, (credits / 10) * 100)}%` }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">크레딧 충전</h2>
        <div className="grid grid-cols-2 gap-3">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.credits}
              onClick={() => charge(pack.credits)}
              className="rounded-xl border-2 border-gray-200 bg-white p-5 text-left hover:border-brand-500 transition-colors"
            >
              <p className="text-xl font-bold text-gray-900">{pack.credits}회</p>
              <p className="text-2xl font-bold text-brand-500 mt-1">{pack.price.toLocaleString()}원</p>
              <p className="text-xs text-gray-400 mt-1">세션당 {Math.round(pack.price / pack.credits).toLocaleString()}원</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">* 결제 연동 전 데모 — 충전 시 즉시 크레딧이 추가됩니다.</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">스토리뱅크</h2>
          <a href="/story-bank" className="text-xs font-medium text-brand-600 hover:underline">
            {cards.length > 0 ? "이어서 채굴하기" : "채굴 시작하기"}
          </a>
        </div>
        {cardsLoading ? (
          <LoadingSpinner />
        ) : cards.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-400">아직 채굴한 스토리가 없어요. 10개의 질문으로 나만의 이야기를 정리해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-400">{c.slot_id}</p>
                <p className="text-sm font-semibold text-gray-900">{c.slot_name}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {c.status === "slot_complete" ? "완성" : "일부 미완성"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
