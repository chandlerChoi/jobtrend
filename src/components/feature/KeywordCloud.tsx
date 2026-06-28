interface KeywordCloudProps {
  keywords: { keyword: string; frequency: number; pct: number }[];
}

export default function KeywordCloud({ keywords }: KeywordCloudProps) {
  const max = Math.max(...keywords.map((k) => k.frequency), 1);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white/80">자격요건 키워드 Top {keywords.length}</h3>
      <div className="flex flex-wrap gap-2">
        {keywords.map(({ keyword, frequency, pct }) => {
          const scale = 0.85 + (frequency / max) * 0.65;
          return (
            <span
              key={keyword}
              className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-brand-500"
              style={{ fontSize: `${scale * 0.9}rem` }}
            >
              {keyword} <span className="text-white/40">{frequency} · {pct}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
