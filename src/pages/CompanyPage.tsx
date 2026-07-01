import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCompany, CompanyResponse } from "../api/endpoints";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function CompanyPage() {
  const { name = "" } = useParams();
  const companyName = decodeURIComponent(name);
  const [data, setData] = useState<CompanyResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    getCompany(companyName).then(setData).catch(() => setNotFound(true));
  }, [companyName]);

  if (notFound) return (
    <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-400">
      기업 정보를 찾을 수 없어요.
    </div>
  );
  if (!data) return <LoadingSpinner />;

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex items-center gap-3">
        <Link to="/news" className="text-sm text-gray-400 hover:text-gray-600">← 트렌드로</Link>
      </div>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{companyName}</h1>
        {data.info?.company_type && (
          <span className="mt-2 inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-600">
            {data.info.company_type}
          </span>
        )}
      </div>

      {data.info && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {data.info.intro_summary && <p className="font-semibold text-gray-900">{data.info.intro_summary}</p>}
          {data.info.intro_detail && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{data.info.intro_detail}</p>}
          {data.info.homepage && (
            <a href={data.info.homepage} target="_blank" rel="noreferrer"
              className="mt-3 inline-block text-sm text-brand-600 hover:underline">
              홈페이지 →
            </a>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">최근 공채 ({data.news.length}건)</h2>
        {data.news.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
            등록된 공채가 없어요.
          </div>
        ) : (
          <div className="space-y-3">
            {data.news.map((n) => (
              <div key={n.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="font-medium text-gray-900">{n.title}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                  {n.employment_types.map((t) => <span key={t} className="rounded bg-gray-100 px-2 py-0.5">{t}</span>)}
                  {n.posted_at && <span>{n.posted_at.slice(0, 10)}</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  {n.posting_url && (
                    <a href={n.posting_url} target="_blank" rel="noreferrer"
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                      원문 보기
                    </a>
                  )}
                  <Link to="/interview" state={{ jdText: `${n.company_name} - ${n.title}` }}
                    className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
                    모의면접 연습
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
