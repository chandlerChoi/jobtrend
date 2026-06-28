import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getCreditBalance, chargeCredits } from "../api/endpoints";

interface CreditContextValue {
  credits: number;
  planTier: string;
  loading: boolean;
  refresh: () => Promise<void>;
  charge: (amount: number) => Promise<void>;
}

const CreditContext = createContext<CreditContextValue | null>(null);

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const [credits, setCredits] = useState(0);
  const [planTier, setPlanTier] = useState("free");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const balance = await getCreditBalance();
    setCredits(balance.credits);
    setPlanTier(balance.planTier);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const charge = useCallback(
    async (amount: number) => {
      const result = await chargeCredits(amount);
      setCredits(result.creditsRemaining);
    },
    []
  );

  return (
    <CreditContext.Provider value={{ credits, planTier, loading, refresh, charge }}>
      {children}
    </CreditContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditContext);
  if (!ctx) throw new Error("useCredits must be used within CreditProvider");
  return ctx;
}
