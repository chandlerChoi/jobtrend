interface Recommendation {
  jobCategory: string;
  similarityScore: number;
  sharedKeywords: string[];
}

export default function JobRecommendCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-900 p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-white">{recommendation.jobCategory}</span>
        <span className="text-sm text-brand-500">{Math.round(recommendation.similarityScore * 100)}%</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {recommendation.sharedKeywords.map((k) => (
          <span key={k} className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/60">
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
