"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Clock, X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";
import { creditsLabel, formatMoney } from "@/lib/billing";
import { saveCheckoutDismissed, useCheckoutReturn } from "./useCheckoutReturn";

const COLLAPSE_MS = 150;

/** Shown once, right after Stripe Checkout returns to /profile. Dismissal is stored per session. */
export default function CheckoutSuccessBanner() {
  const { phase, sessionId, paid } = useCheckoutReturn();
  const { user } = useAuth();
  const { credits } = useBilling();
  const [closing, setClosing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (hidden || !sessionId || (phase !== "success" && phase !== "pending")) {
    return null;
  }

  const dismiss = () => {
    saveCheckoutDismissed(sessionId);
    setClosing(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timer.current = setTimeout(() => setHidden(true), reduce ? 0 : COLLAPSE_MS);
  };

  const success = phase === "success" && !!paid;

  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-150 motion-reduce:transition-none ${
        closing ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          role="status"
          className={`relative flex items-start gap-[14px] rounded-[10px] border bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
            success ? "border-success-border" : "border-line"
          }`}
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              success ? "bg-success-soft text-success" : "bg-gray-100 text-gray-500"
            }`}
          >
            {success ? (
              <Check size={20} strokeWidth={2.4} aria-hidden />
            ) : (
              <Clock size={20} strokeWidth={2.4} aria-hidden />
            )}
          </span>

          <div className="min-w-0 flex-1 pr-8 sm:pr-0">
            <p className="text-[15px] font-semibold text-gray-900">
              {success
                ? `Payment successful — ${creditsLabel(paid.credits)} added`
                : "Payment received — activating your plan…"}
            </p>
            {success && (
              <p className="mt-0.5 text-xs text-gray-600">
                {formatMoney(paid.amountCents, paid.currency)} paid
                {user?.email ? ` by ${user.email}` : ""}.
                {credits !== null && ` You now have ${creditsLabel(credits)}.`}
              </p>
            )}
            {!success && (
              <p className="mt-0.5 text-xs text-gray-600">
                This usually takes a few seconds. Your credits will appear shortly.
              </p>
            )}
            {success && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/compare"
                  className="inline-flex h-[34px] items-center rounded-md bg-action px-3.5 text-xs font-semibold text-white transition-colors hover:bg-action-hover"
                >
                  Generate your first report
                </Link>
                {paid.receiptUrl && (
                  <a
                    href={paid.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-[34px] items-center rounded-md border border-line bg-white px-3.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    View receipt
                  </a>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="absolute right-3 top-3 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md bg-transparent text-gray-500 transition-colors hover:bg-gray-100 sm:static"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
