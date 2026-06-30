import { Link } from "react-router-dom";
import type { RecruitmentNewsRow } from "../../../shared/types";

export default function NewsCard({ news }: { news: RecruitmentNewsRow }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/companies/${encodeURIComponent(news.company_name)}`} className="text-sm text-brand-500 hover:underline">
            {news.company_name}
          </Link>
          <h3 className="mt-1 font-medium">{news.title}</h3>
        </div>
        {news.company_type && (
          <span className="shrink-0 rounded bg-white/10 px-2 py-0.5 text-xs text-white/50">{news.company_type}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/40">
        {news.employment_types.map((t) => (
          <span key={t} className="rounded bg-white/5 px-2 py-0.5">
            {t}
          </span>
        ))}
        <span>{news.posted_at?.slice(0, 10)}</span>
      </div>

      <div className="mt-4 flex gap-2">
        {news.posting_url && (
          <a
            href={news.posting_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
          >
            공고 원문 보기
          </a>
        )}
        <Link
          to="/interview"
          state={{ jdText: `${news.company_name} - ${news.title}` }}
          className="rounded-lg bg-brand-500/20 px-3 py-1.5 text-xs text-brand-500 hover:bg-brand-500/30"
        >
          이 공고로 모의면접 연습하기
        </Link>
      </div>
    </div>
  );
}
