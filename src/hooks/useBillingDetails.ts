"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { fetchBillingDetails } from "@/lib/auth/api";
import type { BillingDetails } from "@/types/billing";

/** Reopening within this window reuses the cached payload without a request. */
const STALE_MS = 5 * 60 * 1000;

interface CacheEntry {
  userKey: string;
  data: BillingDetails;
  fetchedAt: number;
}

// Module-level cache shared by every mount (same approach as the catalog caches
// in lib/auth/api.ts). Keyed by user so a sign-out/in never shows someone else's data.
let cache: CacheEntry | null = null;
let inflight: { userKey: string; promise: Promise<BillingDetails> } | null = null;

function load(userKey: string, force: boolean): Promise<BillingDetails> {
  if (!force && cache?.userKey === userKey && Date.now() - cache.fetchedAt < STALE_MS) {
    return Promise.resolve(cache.data);
  }
  if (inflight?.userKey === userKey) return inflight.promise;

  const promise = fetchBillingDetails()
    .then((data) => {
      cache = { userKey, data, fetchedAt: Date.now() };
      return data;
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { userKey, promise };
  return promise;
}

interface State {
  data: BillingDetails | null;
  error: boolean;
}

/**
 * Billing details for the Plan & Billing popup. Mount it only while the popup is
 * open: that is what makes the fetch lazy. A cached (even stale) payload renders
 * immediately and is revalidated in the background once it is older than STALE_MS.
 */
export function useBillingDetails() {
  const { user } = useAuth();
  const userKey = user ? String(user.id ?? user.email ?? "user") : null;

  const [state, setState] = useState<State>(() => ({
    data: userKey && cache?.userKey === userKey ? cache.data : null,
    error: false,
  }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userKey) return;
    let active = true;
    load(userKey, attempt > 0)
      .then((data) => {
        if (active) setState({ data, error: false });
      })
      .catch((err) => {
        console.error("Failed to load billing details:", err);
        // Keep whatever we were already showing; only surface the error when empty.
        if (active) setState((prev) => ({ ...prev, error: true }));
      });
    return () => {
      active = false;
    };
  }, [userKey, attempt]);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, error: false }));
    setAttempt((n) => n + 1);
  }, []);

  return {
    data: state.data,
    loading: !state.data && !state.error,
    error: !state.data && state.error,
    retry,
  };
}
