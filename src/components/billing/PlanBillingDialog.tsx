"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { CreditCard, X } from "lucide-react";

import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { useBillingDetails } from "@/hooks/useBillingDetails";
import PlanBillingContent, {
  PlanBillingError,
  PlanBillingSkeleton,
} from "./PlanBillingContent";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface PlanBillingDialogProps {
  onClose: () => void;
  /** Element that opened the dialog; it gets focus back on close. */
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

/**
 * Read-only "Plan & Billing" popup. Mount it only while open — the billing
 * request fires on mount. Esc and the X close it; the backdrop deliberately
 * does not.
 */
export default function PlanBillingDialog({
  onClose,
  returnFocusRef,
}: PlanBillingDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { data, loading, error, retry } = useBillingDetails();

  useBodyScrollLock(true);
  useEscapeKey(true, onClose);

  // Focus trap: move focus in on open, keep Tab cycling inside the panel, and
  // hand focus back to the opener on unmount.
  useEffect(() => {
    const returnTo = returnFocusRef.current;
    closeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      returnTo?.focus?.();
    };
  }, [returnFocusRef]);

  return createPortal(
    <div
      role="presentation"
      className="plan-dialog-overlay fixed inset-0 z-[100] flex items-stretch justify-center bg-black/50 sm:items-center"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loading}
        className="plan-dialog-panel flex h-dvh w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:w-[calc(100%-32px)] sm:rounded-[10px] lg:w-[min(960px,calc(100%-48px))]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#EEF0F4] bg-white py-2 pl-5 pr-3 sm:pl-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <CreditCard size={18} className="shrink-0 text-[#2557D6]" aria-hidden />
            <h2
              id={titleId}
              className="truncate text-[15px] font-semibold text-[#111827]"
            >
              Plan &amp; Billing
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F3F4F6] hover:text-[#111827] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2557D6] sm:h-10 sm:w-10"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {data ? (
            <PlanBillingContent data={data} />
          ) : error ? (
            <PlanBillingError onRetry={retry} />
          ) : (
            <PlanBillingSkeleton />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
