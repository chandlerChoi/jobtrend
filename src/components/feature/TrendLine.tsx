interface TrendLineProps {
  data: { date: string; count: number }[];
  title?: string;
}

export default function TrendLine({ data, title = "등록 추이" }: TrendLineProps) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 600;
  const height = 120;
  const step = width / Math.max(data.length - 1, 1);

  const points = data
    .map((d, i) => `${i * step},${height - (d.count / max) * height}`)
    .join(" ");

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-4 text-sm font-semibold text-white/80">{title}</h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full">
        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth={2} />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-white/40">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
