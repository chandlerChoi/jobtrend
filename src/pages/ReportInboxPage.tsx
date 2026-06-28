import { useEffect, useState } from "react";
import { getDailyReport } from "../api/endpoints";
import type { DailyReportContent } from "../../shared/types";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";

export default function ReportInboxPage() {
  const [offset, setOffset] = useState(0);
  const [report, setReport] = useState<DailyReportContent | null>(null);

  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    setReport(null);
    getDailyReport(date.toISOString().slice(0, 10)).then(setReport);
  }, [offset]);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold">데일리 리포트함</h1>
        <p className="mt-1 text-sm text-white/50">등록한 키워드의 전일 대비 트렌드 변화를 매일 받아보세요.</p>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setOffset((o) => o + 1)} className="rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10">
          이전 날
        </button>
        <span className="text-sm font-medium">{report?.date ?? "..."}</span>
        <button
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          className="rounded-lg bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-30"
        >
          다음 날
        </button>
      </div>

      {!report && <LoadingSpinner />}

      {report && report.highlights.length === 0 && report.newPostings.length === 0 && (
        <EmptyState
          title="아직 변화가 감지되지 않았어요."
          description="키워드 알람을 등록하면 변화가 생길 때 여기에 표시돼요."
        />
      )}

      <div className="space-y-3">
        {report?.highlights.map((h) => (
          <div key={h.keyword} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <span className="font-medium">{h.keyword}</span>
              <span className={h.changeType === "frequency_spike" ? "text-emerald-400" : "text-rose-400"}>
                {h.delta}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/60">
              {h.changeType === "frequency_spike" ? "공고 빈도가 급증했어요." : "공고 빈도가 급감했어요."}
            </p>
          </div>
        ))}
      </div>

      {report && report.newPostings.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-white/80">오늘의 신규 공고</h2>
          <div className="space-y-2">
            {report.newPostings.map((p, i) => (
              <a
                key={i}
                href={p.postingUrl ?? "#"}
                className="block rounded-lg bg-white/5 px-4 py-3 text-sm hover:bg-white/10"
              >
                {p.title} <span className="text-white/40">· {p.company}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
