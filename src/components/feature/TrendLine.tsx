interface TrendLineProps {
  data: { date: string; count: number }[];
  title?: string;
}

export default function TrendLine({ data, title }: TrendLineProps) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const width = 600;
  const height = 100;
  const step = width / Math.max(data.length - 1, 1);

  const points = data
    .map((d, i) => `${i * step},${height - (d.count / max) * height}`)
    .join(" ");

  const areaPoints = `0,${height} ${points} ${(data.length - 1) * step},${height}`;

  return (
    <div>
      {title && <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-28 w-full">
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#trendGradient)" />
        <polyline points={points} fill="none" stroke="#22C55E" strokeWidth={2.5} strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle key={i} cx={i * step} cy={height - (d.count / max) * height} r={3} fill="#22C55E" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-gray-400">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}
