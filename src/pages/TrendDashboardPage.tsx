import { Link, useParams } from "react-router-dom";
import { CATEGORIES } from "../../shared/categories";
import { useTrendData } from "../hooks/useTrendData";
import BarDist from "../components/feature/BarDist";
import KeywordCloud from "../components/feature/KeywordCloud";
import TrendLine from "../components/feature/TrendLine";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";

export default function TrendDashboardPage() {
  const { jobCategory = "" } = useParams();
  const decoded = decodeURIComponent(jobCategory);
  const { data, loading, notCollected, error } = useTrendData(decoded);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Link
            key={c.name}
            to={`/trends/${encodeURIComponent(c.name)}`}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              decoded === c.name ? "bg-brand-500 text-white" : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {loading && <LoadingSpinner label="트렌드 데이터를 불러오는 중..." />}
      {error && <EmptyState title="오류가 발생했어요" description={error} />}
      {notCollected && (
        <EmptyState
          title="아직 수집되지 않은 직무입니다"
          description="해당 직무의 공고 수집을 요청하면 다음 배치에 포함돼요."
          action={
            <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium">수집 요청하기</button>
          }
        />
      )}

      {data && (
        <>
          <div>
            <h1 className="text-2xl font-bold">{data.jobCategory} 트렌드</h1>
            <p className="mt-1 text-xs text-white/40">최근 갱신: {new Date(data.lastUpdated).toLocaleString("ko-KR")}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs text-white/50">최근 30일 공고 수</p>
              <p className="mt-1 text-3xl font-bold">{data.totalPostings}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs text-white/50">최다 키워드</p>
              <p className="mt-1 text-3xl font-bold">{data.topKeywords[0]?.keyword ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs text-white/50">최다 경력 구간</p>
              <p className="mt-1 text-3xl font-bold">
                {[...data.experienceDistribution].sort((a, b) => b.count - a.count)[0]?.range ?? "-"}
              </p>
            </div>
          </div>

          <TrendLine data={data.postingTrend} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarDist
              title="경력 수준 분포"
              items={data.experienceDistribution.map((d) => ({ label: d.range, count: d.count, pct: d.pct }))}
            />
            <BarDist
              title="학력 요건 분포"
              items={data.educationDistribution.map((d) => ({ label: d.level, count: d.count, pct: d.pct }))}
            />
          </div>

          <KeywordCloud keywords={data.topKeywords} />

          <Link
            to={`/adjacent/${encodeURIComponent(data.jobCategory)}`}
            className="inline-block rounded-lg bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
          >
            이 직무와 가까운 인접 직무 보기 →
          </Link>
        </>
      )}
    </div>
  );
}
