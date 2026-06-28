import { useCredits } from "../context/CreditContext";
import { useAlerts } from "../hooks/useAlerts";
import CreditMeter from "../components/feature/CreditMeter";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";

const CREDIT_PACKS = [
  { credits: 5, price: 4900 },
  { credits: 10, price: 8900 }
];

export default function MyPage() {
  const { credits, planTier, loading: creditsLoading, charge } = useCredits();
  const { alerts, loading: alertsLoading, remove } = useAlerts();

  return (
    <div className="space-y-8 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold">마이페이지</h1>
        <p className="mt-1 text-sm text-white/50">키워드 알람과 모의면접 크레딧을 관리하세요.</p>
      </div>

      <section className="space-y-4">
        {creditsLoading ? <LoadingSpinner /> : <CreditMeter credits={credits} planTier={planTier} />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.credits}
              onClick={() => charge(pack.credits)}
              className="rounded-lg border border-white/10 bg-ink-900 p-4 text-left hover:border-brand-500/50"
            >
              <p className="text-lg font-semibold">{pack.credits}회 충전권</p>
              <p className="text-sm text-white/50">{pack.price.toLocaleString()}원</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-white/30">무제한 모의면접 월구독 9,900원/월 · 프리미엄 알람 20개 4,900원/월 (결제 연동 전 데모)</p>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white/80">등록된 키워드 알람 ({alerts.length}/5)</h2>
        {alertsLoading && <LoadingSpinner />}
        {!alertsLoading && alerts.length === 0 && <EmptyState title="등록된 알람이 없어요." />}
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-ink-900 px-4 py-3 text-sm">
              <span>{a.keyword}</span>
              <button onClick={() => remove(a.id)} className="text-xs text-white/40 hover:text-white">
                삭제
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
