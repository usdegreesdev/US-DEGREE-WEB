"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { fetchCredits, fetchPayments } from "@/lib/auth/api";
import type { Payment } from "@/types/billing";

interface BillingContextType {
  /** `null` until the first load for the signed-in user finishes (or when signed out). */
  credits: number | null;
  payments: Payment[] | null;
  /** True once the user has at least one completed payment. */
  isMember: boolean;
  refresh: () => Promise<void>;
}

const BillingContext = createContext<BillingContextType>({
  credits: null,
  payments: null,
  isMember: false,
  refresh: async () => {},
});

interface Loaded {
  userKey: string;
  credits: number;
  payments: Payment[];
}

async function loadBilling(userKey: string): Promise<Loaded> {
  try {
    const [credits, payments] = await Promise.all([fetchCredits(), fetchPayments()]);
    return { userKey, credits, payments };
  } catch (err) {
    console.error("Failed to load billing:", err);
    return { userKey, credits: 0, payments: [] };
  }
}

/**
 * Single source of the signed-in user's credits and payment history, shared by
 * the navbar and the profile page so it is fetched once per user.
 */
export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userKey = user ? String(user.id ?? user.email ?? "user") : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!userKey) return;
    let active = true;
    loadBilling(userKey).then((next) => {
      if (active) setLoaded(next);
    });
    return () => {
      active = false;
    };
  }, [userKey]);

  const refresh = useCallback(async () => {
    if (userKey) setLoaded(await loadBilling(userKey));
  }, [userKey]);

  const current = loaded && loaded.userKey === userKey ? loaded : null;

  const value = useMemo(
    () => ({
      credits: current?.credits ?? null,
      payments: current?.payments ?? null,
      isMember: (current?.payments.length ?? 0) > 0,
      refresh,
    }),
    [current, refresh],
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export const useBilling = () => useContext(BillingContext);
