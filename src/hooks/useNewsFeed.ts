// Legacy hook — kept for any remaining references; TrendDashboardPage calls getTrends directly.
import { useEffect, useState } from "react";
import { getTrends, TrendResponse } from "../api/endpoints";

export function useNewsFeed(companyName?: string) {
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getTrends({ limit: 50 })
      .then((res: TrendResponse) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError("공채속보를 불러오지 못했어요.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [companyName]);

  return { data, loading, error };
}
