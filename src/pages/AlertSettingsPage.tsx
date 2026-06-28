import { useAlerts } from "../hooks/useAlerts";
import AlertForm from "../components/feature/AlertForm";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";

const MAX_FREE_ALERTS = 5;

export default function AlertSettingsPage() {
  const { alerts, loading, limitReached, add, remove } = useAlerts();

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold">키워드 알람 설정</h1>
        <p className="mt-1 text-sm text-white/50">
          관심 키워드를 등록하면 신규 공고와 트렌드 변화를 알려드려요. (무료 최대 {MAX_FREE_ALERTS}개)
        </p>
      </div>

      <AlertForm disabled={alerts.length >= MAX_FREE_ALERTS} onSubmit={add} />
      {limitReached && (
        <p className="text-xs text-rose-400">무료 플랜 알람 한도(5개)를 초과했어요. 프리미엄에서 20개까지 등록할 수 있어요.</p>
      )}

      {loading && <LoadingSpinner />}

      {!loading && alerts.length === 0 && <EmptyState title="아직 등록된 알람이 없어요." />}

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">{alert.keyword}</span>
              <span className="text-white/40">{alert.channel === "email" ? "이메일" : "푸시"} 알림</span>
            </div>
            <button onClick={() => remove(alert.id)} className="text-xs text-white/40 hover:text-white">
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
