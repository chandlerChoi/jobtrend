import { useCallback, useEffect, useState } from "react";
import { listAlerts, createAlert, deleteAlert } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { KeywordAlertRow } from "../../shared/types";

export function useAlerts() {
  const [alerts, setAlerts] = useState<KeywordAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [limitReached, setLimitReached] = useState(false);

  const refresh = useCallback(async () => {
    const { alerts } = await listAlerts();
    setAlerts(alerts);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const add = useCallback(
    async (payload: { keyword: string; jobCategory?: string; region?: string; channel: "email" | "push" }) => {
      try {
        await createAlert(payload);
        setLimitReached(false);
        await refresh();
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setLimitReached(true);
        } else {
          throw err;
        }
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteAlert(id);
      await refresh();
    },
    [refresh]
  );

  return { alerts, loading, limitReached, add, remove };
}
