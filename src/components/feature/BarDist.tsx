interface BarDistProps {
  title: string;
  items: { label: string; count: number; pct: number }[];
}

export default function BarDist({ title, items }: BarDistProps) {
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white/80">{title}</h3>
      <div className="space-y-3">
        {items.map(({ label, count, pct }) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 text-white/60">{label}</span>
            <div className="h-2.5 flex-1 rounded-full bg-white/10">
              <div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right text-white/50">
              {count} ({pct}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
