import { useEffect, useState } from "react";
import { getTrends, TrendResponse } from "../api/endpoints";
import { ApiError } from "../api/client";

interface State {
  data: TrendResponse | null;
  loading: boolean;
  notCollected: boolean;
  error: string | null;
}

export function useTrendData(jobCategory: string) {
  const [state, setState] = useState<State>({ data: null, loading: true, notCollected: false, error: null });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, notCollected: false, error: null });

    getTrends(jobCategory)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, notCollected: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setState({ data: null, loading: false, notCollected: true, error: null });
        } else {
          setState({ data: null, loading: false, notCollected: false, error: "트렌드 데이터를 불러오지 못했어요." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobCategory]);

  return state;
}
