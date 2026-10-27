"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useBilling } from "@/context/BillingContext";
import { fetchCheckoutStatus } from "@/lib/auth/api";
import type { CheckoutStatus } from "@/types/billing";

export const DISMISSED_CHECKOUT_KEY = "usd_dismissed_checkout";
const POLL_MS = 2000;
const POLL_WINDOW_MS = 20000;

export type PaidCheckout = Extract<CheckoutStatus, { status: "paid" }>;

/**
 * - idle: nothing to show
 * - verifying: returned from Checkout, confirming with the backend (renders nothing)
 * - success: backend confirmed the payment is recorded
 * - pending: paid at Stripe but the webhook hasn't landed within the polling window
 */
export type CheckoutPhase = "idle" | "verifying" | "success" | "pending";

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_CHECKOUT_KEY);
  } catch {
    return null;
  }
}

export function saveCheckoutDismissed(sessionId: string): void {
  try {
    localStorage.setItem(DISMISSED_CHECKOUT_KEY, sessionId);
  } catch {
    // storage unavailable — banner may reappear on a manual revisit, nothing else breaks
  }
}

/**
 * Detects the return from Stripe Checkout (`/profile?checkout=success&session_id=...`),
 * confirms with GET /billing/checkout-status (the query string alone is not
 * trusted), then strips the params from the URL.
 */
export function useCheckoutReturn(): {
  phase: CheckoutPhase;
  sessionId: string | null;
  paid: PaidCheckout | null;
} {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { refresh } = useBilling();

  // Captured once: the URL is cleaned below, but the banner must outlive it.
  const [sessionId] = useState(() =>
    params.get("checkout") === "success" ? params.get("session_id") : null,
  );
  const [phase, setPhase] = useState<CheckoutPhase>(sessionId ? "verifying" : "idle");
  const [paid, setPaid] = useState<PaidCheckout | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanUrl = () => {
      const next = new URLSearchParams(window.location.search);
      next.delete("checkout");
      next.delete("session_id");
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`, {
        scroll: false,
      });
    };

    const run = async () => {
      if (readDismissed() === sessionId) {
        cleanUrl();
        setPhase("idle");
        return;
      }
      const started = Date.now();
      for (;;) {
        let result: CheckoutStatus | null = null;
        try {
          result = await fetchCheckoutStatus(sessionId);
        } catch {
          // transient — keep polling until the window closes
        }
        if (cancelled) return;

        if (result?.status === "paid") {
          await refresh(); // pull the new balance/history for the navbar and card
          if (cancelled) return;
          setPaid(result);
          setPhase("success");
          break;
        }
        if (result?.status === "unknown" || result?.status === "unpaid") {
          // Not a paid session of this user — show nothing.
          setPhase("idle");
          break;
        }
        if (Date.now() - started >= POLL_WINDOW_MS) {
          setPhase(result?.status === "processing" ? "pending" : "idle");
          break;
        }
        await new Promise<void>((resolve) => {
          timer = setTimeout(resolve, POLL_MS);
        });
        if (cancelled) return;
      }
      cleanUrl();
    };
    run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [sessionId, refresh, router, pathname]);

  return { phase, sessionId, paid };
}
