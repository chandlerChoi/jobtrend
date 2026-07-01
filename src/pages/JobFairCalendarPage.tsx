import { useEffect, useState } from "react";
import { listJobFairs } from "../api/endpoints";
import type { JobFairRow } from "../../shared/types";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function JobFairCalendarPage() {
  const [fairs, setFairs] = useState<JobFairRow[] | null>(null);

  useEffect(() => {
    listJobFairs().then((res) => setFairs(res.fairs));
  }, []);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">채용행사 캘린더</h1>
        <p className="mt-1 text-sm text-gray-500">고용노동부·고용센터에서 여는 채용박람회·구인구직 만남의날 일정이에요.</p>
      </div>

      {!fairs && <LoadingSpinner />}
      {fairs && fairs.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-gray-400">
          예정된 채용행사가 없어요.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fairs?.map((fair) => (
          <div key={fair.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{fair.event_name}</h3>
              {fair.area && (
                <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-600">
                  {fair.area}
                </span>
              )}
            </div>
            {fair.event_term && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-600">
                <span>📅</span> {fair.event_term}
              </p>
            )}
            {fair.event_place && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                <span>📍</span> {fair.event_place}
              </p>
            )}
            {fair.participating_companies && (
              <div className="mt-3 flex flex-wrap gap-1">
                {fair.participating_companies.split(/[,，]/).slice(0, 4).map((c, i) => (
                  <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{c.trim()}</span>
                ))}
                {fair.participating_companies.split(/[,，]/).length > 4 && (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    외 {fair.participating_companies.split(/[,，]/).length - 4}개
                  </span>
                )}
              </div>
            )}
            {fair.contact_phone && (
              <p className="mt-2 text-xs text-gray-400">문의: {fair.contact_phone}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
