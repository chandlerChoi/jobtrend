export default function CreditMeter({ credits, planTier }: { credits: number; planTier: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-5">
      <div>
        <h2 className="text-sm font-semibold text-white/80">모의면접 크레딧</h2>
        <p className="mt-1 text-xs text-white/40">{planTier === "premium" ? "프리미엄 플랜" : "무료 플랜"}</p>
      </div>
      <span className="text-2xl font-bold text-brand-500">{credits}회</span>
    </div>
  );
}
