import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCompany, CompanyResponse } from "../api/endpoints";
import NewsCard from "../components/feature/NewsCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";

export default function CompanyPage() {
  const { name = "" } = useParams();
  const companyName = decodeURIComponent(name);
  const [data, setData] = useState<CompanyResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    getCompany(companyName)
      .then(setData)
      .catch(() => setNotFound(true));
  }, [companyName]);

  if (notFound) return <EmptyState title="기업 정보를 찾을 수 없어요." />;
  if (!data) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold">{companyName}</h1>
        {data.info?.company_type && <p className="mt-1 text-sm text-white/50">{data.info.company_type}</p>}
      </div>

      {data.info && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          {data.info.intro_summary && <p className="font-medium">{data.info.intro_summary}</p>}
          {data.info.intro_detail && <p className="mt-2 text-sm text-white/60">{data.info.intro_detail}</p>}
          {data.info.homepage && (
            <a href={data.info.homepage} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-brand-500 hover:underline">
              홈페이지 바로가기
            </a>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-white/80">최근 공채</h2>
        {data.news.length === 0 ? (
          <EmptyState title="등록된 공채가 없어요." />
        ) : (
          <div className="space-y-3">
            {data.news.map((n) => (
              <NewsCard key={n.id} news={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
