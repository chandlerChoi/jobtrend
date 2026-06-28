import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getAdjacentJobs, AdjacentJobsResponse } from "../api/endpoints";
import JobRecommendCard from "../components/feature/JobRecommendCard";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function AdjacentJobsPage() {
  const { jobCategory = "" } = useParams();
  const decoded = decodeURIComponent(jobCategory);
  const [data, setData] = useState<AdjacentJobsResponse | null>(null);

  useEffect(() => {
    setData(null);
    getAdjacentJobs(decoded).then(setData);
  }, [decoded]);

  return (
    <div className="space-y-6 animate-fadeUp">
      <div>
        <h1 className="text-2xl font-bold">{decoded}의 인접 직무</h1>
        <p className="mt-1 text-sm text-white/50">자격요건 키워드 유사도를 기준으로 가까운 직무를 찾아드려요.</p>
      </div>

      {!data && <LoadingSpinner />}

      {data && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.recommendations.map((rec) => (
            <JobRecommendCard key={rec.jobCategory} recommendation={rec} />
          ))}
        </div>
      )}
    </div>
  );
}
