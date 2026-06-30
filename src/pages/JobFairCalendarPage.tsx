import { useEffect, useState } from "react";
import { listJobFairs } from "../api/endpoints";
import type { JobFairRow } from "../../shared/types";
import LoadingSpinner from "../components/common/LoadingSpinner";
import EmptyState from "../components/common/EmptyState";

export default function JobFairCalendarPage() {
  const [fairs, setFairs] = useState<JobFairRow[] | null>(null);

  useEffect(() => {
    listJobFairs().then((res) => setFairs(res.fairs));
  }, []);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold">채용행사 캘린더</h1>
        <p className="mt-1 text-sm text-white/50">고용노동부·고용센터에서 여는 채용박람회·구인구직 만남의날 일정이에요.</p>
      </div>

      {!fairs && <LoadingSpinner />}
      {fairs && fairs.length === 0 && <EmptyState title="예정된 채용행사가 없어요." />}

      <div className="space-y-3">
        {fairs?.map((fair) => (
          <div key={fair.id} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{fair.event_name}</h3>
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/50">{fair.area}</span>
            </div>
            <p className="mt-1 text-sm text-white/60">{fair.event_term}</p>
            {fair.event_place && <p className="mt-1 text-xs text-white/40">장소: {fair.event_place}</p>}
            {fair.participating_companies && (
              <p className="mt-2 text-xs text-white/40">참여기업: {fair.participating_companies}</p>
            )}
            {fair.contact_phone && <p className="mt-1 text-xs text-white/30">문의: {fair.contact_phone}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
