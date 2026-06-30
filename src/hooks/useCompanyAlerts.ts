import { useCallback, useEffect, useState } from "react";
import { listAlerts, createAlert, deleteAlert } from "../api/endpoints";
import { ApiError } from "../api/client";
import type { CompanyAlertRow } from "../../shared/types";

export function useCompanyAlerts() {
  const [alerts, setAlerts] = useState<CompanyAlertRow[]>([]);
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
    async (companyName: string, channel: "email" | "push" = "email") => {
      try {
        await createAlert({ companyName, channel });
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
