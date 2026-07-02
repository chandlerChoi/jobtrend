import { useState, useEffect, useCallback } from "react";
import { getTrends, getNewsSummary, listBookmarks, addBookmark, removeBookmark } from "../api/endpoints";
import type { TrendResponse } from "../api/endpoints";
import TrendLine from "../components/feature/TrendLine";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { Link } from "react-router-dom";
import type { RecruitmentNewsRow } from "../../shared/types";

const INDUSTRIES = ["전체", "IT·SW", "제조", "금융", "공공기관", "유통·서비스"];
const SIZES = ["전체", "대기업", "중견", "중소", "공공"];
const EMP_TYPES = ["전체", "정규직", "기간제", "계약직", "인턴"];

function NewsCard({
  news,
  bookmarked,
  onToggleBookmark
}: {
  news: RecruitmentNewsRow;
  bookmarked: boolean;
  onToggleBookmark: (news: RecruitmentNewsRow) => void;
}) {
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/companies/${encodeURIComponent(news.company_name)}`} className="text-sm font-medium text-brand-600 hover:underline">
            {news.company_name}
          </Link>
          <h3 className="mt-1 font-semibold text-gray-900 leading-snug">{news.title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {news.company_type && (
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-600">
              {news.company_type}
            </span>
          )}
          <button
            onClick={() => onToggleBookmark(news)}
            title={bookmarked ? "저장 해제" : "공고 저장"}
            className={`text-lg leading-none transition-colors ${
              bookmarked ? "text-amber-400 hover:text-amber-500" : "text-gray-300 hover:text-amber-400"
            }`}
          >
            {bookmarked ? "★" : "☆"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        {news.employment_types.map((t) => (
          <span key={t} className="rounded bg-gray-100 px-2 py-0.5">{t}</span>
        ))}
        {news.posted_at && <span className="ml-auto">{news.posted_at.slice(0, 10)}</span>}
      </div>

      {expanded && (
        <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm">
          {loadingSummary ? (
            <p className="text-gray-400">AI 요약 생성 중...</p>
          ) : summary ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">자격요건</p>
                {summary.requirements.map((r, i) => (
                  <p key={i} className="text-brand-700 text-xs before:content-['✓_']">{r}</p>
                ))}
              </div>
              {summary.preferred.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">우대사항</p>
                  {summary.preferred.map((r, i) => (
                    <p key={i} className="text-gray-500 text-xs before:content-['·_']">{r}</p>
                  ))}
                </div>
              )}
              {summary.interviewType.length > 0 && (
                <div className="flex gap-1 flex-wrap items-center">
                  <span className="text-xs text-gray-400">예상 면접:</span>
                  {summary.interviewType.map((t) => (
                    <span key={t} className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs">{t}</span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-4 flex gap-2 flex-wrap">
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
          className="ml-auto rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 transition-colors"
        >
          모의면접
        </Link>
      </div>
    </div>
  );
}

export default function TrendDashboardPage() {
  const [industry, setIndustry] = useState("전체");
  const [size, setSize] = useState("전체");
  const [empType, setEmpType] = useState("전체");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [savedNews, setSavedNews] = useState<RecruitmentNewsRow[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    listBookmarks()
      .then((res) => {
        setBookmarkedIds(new Set(res.ids));
        setSavedNews(res.news);
      })
      .catch(() => {});
  }, []);

  async function toggleBookmark(news: RecruitmentNewsRow) {
    const isBookmarked = bookmarkedIds.has(news.id);
    // optimistic update
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(news.id);
      else next.add(news.id);
      return next;
    });
    setSavedNews((prev) => (isBookmarked ? prev.filter((n) => n.id !== news.id) : [news, ...prev]));
    try {
      if (isBookmarked) await removeBookmark(news.id);
      else await addBookmark(news.id);
    } catch {
      // revert on failure
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isBookmarked) next.add(news.id);
        else next.delete(news.id);
        return next;
      });
      setSavedNews((prev) => (isBookmarked ? [news, ...prev] : prev.filter((n) => n.id !== news.id)));
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTrends({
        industry: industry !== "전체" ? industry : undefined,
        size: size !== "전체" ? size : undefined,
        employmentType: empType !== "전체" ? empType : undefined,
        keyword: appliedKeyword || undefined,
        limit: 60,
      });
      setData(res);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [industry, size, empType, appliedKeyword]);

  useEffect(() => { load(); }, [load]);

  const activeFilterCount = [
    industry !== "전체",
    size !== "전체",
    empType !== "전체",
    !!appliedKeyword,
  ].filter(Boolean).length;

  function resetFilters() {
    setIndustry("전체");
    setSize("전체");
    setEmpType("전체");
    setKeyword("");
    setAppliedKeyword("");
  }

  return (
    <div className="space-y-5 animate-fadeUp">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">채용 트렌드</h1>
          <p className="mt-1 text-sm text-gray-500">고용24 공채속보를 AI가 실시간으로 분석해드려요.</p>
        </div>
        <button
          onClick={() => setShowSaved((v) => !v)}
          className={`shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            showSaved
              ? "bg-amber-400 text-white"
              : "border border-gray-200 bg-white text-gray-600 hover:border-amber-400 hover:text-amber-500"
          }`}
        >
          ★ 저장한 공고
          {bookmarkedIds.size > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-xs leading-none ${showSaved ? "bg-white/25" : "bg-amber-100 text-amber-600"}`}>
              {bookmarkedIds.size}
            </span>
          )}
        </button>
      </div>

      {/* 저장한 공고 보기 */}
      {showSaved && (
        savedNews.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-400">저장한 공고가 없어요. 카드의 ☆ 버튼으로 공고를 저장해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {savedNews.map((n) => (
              <NewsCard key={n.id} news={n} bookmarked={bookmarkedIds.has(n.id)} onToggleBookmark={toggleBookmark} />
            ))}
          </div>
        )
      )}

      {!showSaved && (
      <>
      {/* 검색바 */}
      <div className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setAppliedKeyword(keyword)}
          placeholder="기업명 또는 공채 제목으로 검색"
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          onClick={() => setAppliedKeyword(keyword)}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          검색
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
          >
            필터 초기화 ({activeFilterCount})
          </button>
        )}
      </div>

      {/* 필터 행 */}
      <div className="space-y-2">
        {/* 업종 */}
        <div className="flex gap-1.5 flex-wrap">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind}
              onClick={() => setIndustry(ind)}
              className={`rounded-full px-3.5 py-1 text-sm font-medium transition-colors ${
                industry === ind
                  ? "bg-brand-500 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-brand-400 hover:text-brand-600"
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
        {/* 기업규모 + 고용형태 */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-gray-400 mr-1">규모</span>
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`rounded-full px-3 py-0.5 text-xs transition-colors ${
                size === s
                  ? "bg-gray-700 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <span className="text-xs text-gray-400 mr-1">고용형태</span>
          {EMP_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setEmpType(t)}
              className={`rounded-full px-3 py-0.5 text-xs transition-colors ${
                empType === t
                  ? "bg-gray-700 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingSpinner label="불러오는 중..." />}

      {data && !loading && (
        <>
          {/* 상단: 차트 + AI 인사이트 */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500 mb-3">최근 7일 공채 등록 추이</p>
              <TrendLine data={data.trend} title="" />
            </div>
            <div className="lg:col-span-2 rounded-xl border border-brand-100 bg-brand-50 p-5 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🤖</span>
                <p className="text-sm font-semibold text-gray-700">AI 트렌드 인사이트</p>
              </div>
              {data.insight ? (
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{data.insight}</p>
              ) : (
                <p className="text-sm text-gray-400 italic">필터 변경 시 AI가 해석해드려요.</p>
              )}
              <p className="mt-3 text-xs text-gray-400">
                {activeFilterCount > 0
                  ? `필터 적용 중 · `
                  : "전체 · "}
                {data.total}건 수집
              </p>
            </div>
          </div>

          {/* 결과 수 */}
          <p className="text-sm text-gray-500">
            {data.news.length}건{activeFilterCount > 0 && " (필터 적용됨)"}
          </p>

          {/* 공채 카드 그리드 */}
          {data.news.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
              <p className="text-gray-400">해당 조건의 공채속보가 없어요.</p>
              <button onClick={resetFilters} className="mt-3 text-sm text-brand-600 hover:underline">
                필터 초기화
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.news.map((n) => (
                <NewsCard key={n.id} news={n} bookmarked={bookmarkedIds.has(n.id)} onToggleBookmark={toggleBookmark} />
              ))}
            </div>
          )}
        </>
      )}
      </>
      )}
    </div>
  );
}
