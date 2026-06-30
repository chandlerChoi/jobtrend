import { useState } from "react";
import { useNewsFeed } from "../hooks/useNewsFeed";
import TrendLine from "../components/feature/TrendLine";
import NewsCard from "../components/feature/NewsCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";

export default function NewsFeedPage() {
  const [companyFilter, setCompanyFilter] = useState("");
  const [appliedFilter, setAppliedFilter] = useState<string | undefined>(undefined);
  const { data, loading, error } = useNewsFeed(appliedFilter);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold">공채속보</h1>
        <p className="mt-1 text-sm text-white/50">고용24에 새로 등록된 공채를 실시간으로 모아 보여드려요.</p>
      </div>

      <div className="flex gap-2">
        <input
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setAppliedFilter(companyFilter || undefined)}
          placeholder="기업명으로 검색 (예: 네오테크)"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm"
        />
        <button
          onClick={() => setAppliedFilter(companyFilter || undefined)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium"
        >
          검색
        </button>
        {appliedFilter && (
          <button
            onClick={() => {
              setCompanyFilter("");
              setAppliedFilter(undefined);
            }}
            className="rounded-lg bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            초기화
          </button>
        )}
      </div>

      {loading && <LoadingSpinner label="공채속보를 불러오는 중..." />}
      {error && <EmptyState title="오류가 발생했어요" description={error} />}

      {data && (
        <>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs text-white/50">누적 수집 공채</p>
            <p className="mt-1 text-3xl font-bold">{data.total}건</p>
          </div>

          <TrendLine data={data.trend} title="최근 7일 공채속보 등록 추이" />

          {data.news.length === 0 ? (
            <EmptyState title="해당 조건의 공채속보가 없어요." />
          ) : (
            <div className="space-y-3">
              {data.news.map((n) => (
                <NewsCard key={n.id} news={n} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
