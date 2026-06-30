import { useState } from "react";
import { useCompanyAlerts } from "../hooks/useCompanyAlerts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";

const MAX_FREE_ALERTS = 5;

export default function AlertSettingsPage() {
  const { alerts, loading, limitReached, add, remove } = useCompanyAlerts();
  const [companyName, setCompanyName] = useState("");
  const [channel, setChannel] = useState<"email" | "push">("email");

  async function handleAdd() {
    if (!companyName.trim()) return;
    await add(companyName.trim(), channel);
    setCompanyName("");
  }

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold">관심기업 알림 설정</h1>
        <p className="mt-1 text-sm text-white/50">
          관심기업을 등록하면 새 공채가 올라올 때 알려드려요. (무료 최대 {MAX_FREE_ALERTS}개)
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="기업명 (예: 네오테크)"
            className="rounded-lg bg-ink-900 px-3 py-2 text-sm sm:col-span-2"
          />
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as "email" | "push")}
            className="rounded-lg bg-ink-900 px-3 py-2 text-sm"
          >
            <option value="email">이메일</option>
            <option value="push">푸시</option>
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={alerts.length >= MAX_FREE_ALERTS || !companyName.trim()}
          className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          {alerts.length >= MAX_FREE_ALERTS ? "무료 등록 한도 도달" : "알람 등록"}
        </button>
      </div>

      {limitReached && (
        <p className="text-xs text-rose-400">무료 플랜 알람 한도(5개)를 초과했어요. 프리미엄에서 20개까지 등록할 수 있어요.</p>
      )}

      {loading && <LoadingSpinner />}
      {!loading && alerts.length === 0 && <EmptyState title="아직 등록된 관심기업이 없어요." />}

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">{alert.company_name}</span>
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
