import { useState, useEffect, useCallback } from "react";
import { getTrends, getNewsSummary } from "../api/endpoints";
import type { TrendResponse } from "../api/endpoints";
import TrendLine from "../components/feature/TrendLine";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { Link } from "react-router-dom";
import type { RecruitmentNewsRow } from "../../shared/types";

const INDUSTRIES = ["전체", "IT·SW", "제조", "금융", "공공기관", "유통·서비스"];
const SIZES = ["전체", "대기업", "중견", "중소", "공공"];

function NewsCard({ news }: { news: RecruitmentNewsRow }) {
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState<{ requirements: string[]; preferred: string[]; interviewType: string[] } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  async function handleSummary() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (summary) return;
    setLoadingSummary(true);
    try {
      const res = await getNewsSummary(news.id);
      setSummary(res.summary);
    } catch {
      setSummary({ requirements: ["자격요건 정보를 불러올 수 없어요."], preferred: [], interviewType: [] });
    } finally {
      setLoadingSummary(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/companies/${encodeURIComponent(news.company_name)}`} className="text-sm font-medium text-brand-600 hover:underline">
            {news.company_name}
          </Link>
          <h3 className="mt-1 font-semibold text-gray-900">{news.title}</h3>
        </div>
        {news.company_type && (
          <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-600">
            {news.company_type}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {news.employment_types.map((t) => (
          <span key={t} className="rounded bg-gray-100 px-2 py-0.5">{t}</span>
        ))}
        {news.posted_at && <span>{news.posted_at.slice(0, 10)}</span>}
      </div>

      {expanded && (
        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm">
          {loadingSummary ? (
            <p className="text-gray-500">AI 요약 생성 중...</p>
          ) : summary ? (
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-700 mb-1">자격요건</p>
                {summary.requirements.map((r, i) => (
                  <p key={i} className="text-brand-600 before:content-['✓_'] before:font-bold">{r}</p>
                ))}
              </div>
              {summary.preferred.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700 mb-1">우대사항</p>
                  {summary.preferred.map((r, i) => (
                    <p key={i} className="text-gray-500 before:content-['·_']">{r}</p>
                  ))}
                </div>
              )}
              {summary.interviewType.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  <span className="text-gray-500 text-xs mr-1">예상 면접:</span>
                  {summary.interviewType.map((t) => (
                    <span key={t} className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSummary}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {expanded ? "요약 닫기" : "공고 요약 보기"}
        </button>
        {news.posting_url && (
          <a href={news.posting_url} target="_blank" rel="noreferrer"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
            원문 보기
          </a>
        )}
        <Link
          to="/interview"
          state={{ jdText: `${news.company_name} - ${news.title}` }}
          className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
        >
          모의면접 연습하기
        </Link>
      </div>
    </div>
  );
}

export default function TrendDashboardPage() {
  const [industry, setIndustry] = useState("전체");
  const [size, setSize] = useState("전체");
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTrends({
        industry: industry !== "전체" ? industry : undefined,
        size: size !== "전체" ? size : undefined,
        limit: 50,
      });
      setData(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [industry, size]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">채용 트렌드</h1>
        <p className="mt-1 text-sm text-gray-500">고용24 공채속보를 AI가 실시간으로 분석해드려요.</p>
      </div>

      {/* 업종 필터 탭 */}
      <div className="flex gap-2 flex-wrap">
        {INDUSTRIES.map((ind) => (
          <button
            key={ind}
            onClick={() => setIndustry(ind)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              industry === ind
                ? "bg-brand-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600"
            }`}
          >
            {ind}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              size === s
                ? "bg-gray-800 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner label="트렌드 데이터를 불러오는 중..." />}

      {data && !loading && (
        <>
          {/* 상단 2컬럼: 차트 + AI 인사이트 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-3">최근 7일 공채 등록 추이</p>
              <TrendLine data={data.trend} title="" />
            </div>

            <div className="lg:col-span-2 rounded-xl border border-brand-100 bg-brand-50 p-5 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🤖</span>
                <p className="text-sm font-semibold text-gray-700">이번 주 AI 트렌드 인사이트</p>
              </div>
              {data.insight ? (
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{data.insight}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">인사이트를 생성하는 중이에요. 잠시 후 다시 확인해주세요.</p>
              )}
              <p className="mt-3 text-xs text-gray-400">
                총 {data.total}건 수집
                {data.insightCachedAt && ` · ${data.insightCachedAt.slice(0, 10)} 기준`}
              </p>
            </div>
          </div>

          {/* 공채 카드 그리드 */}
          {data.news.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-400">
              해당 조건의 공채속보가 없어요.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
