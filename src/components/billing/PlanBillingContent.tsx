import Link from "next/link";
import { Check, FileText } from "lucide-react";

import { formatDate, formatMoney } from "@/lib/billing";
import type { BillingDetails } from "@/types/billing";

type Plan = NonNullable<BillingDetails["currentPlan"]>;
type Payment = NonNullable<BillingDetails["lastPayment"]>;

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7280]";
const LINK =
  "inline-flex min-h-11 items-center gap-1.5 font-medium text-[#2557D6] hover:text-[#1a3fa3] hover:underline";
const BORDER = "border-[#E6E9EF]";

const PILL_TONES = {
  green: "bg-[#E7F6EC] text-[#166534]",
  grey: "bg-[#F3F4F6] text-[#4B5563]",
  orange: "bg-[#FDECDC] text-[#9A3412]",
} as const;

function Pill({ tone, children }: { tone: keyof typeof PILL_TONES; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PILL_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

const PLAN_STATUS: Record<Plan["status"], { tone: keyof typeof PILL_TONES; label: string }> = {
  active: { tone: "green", label: "Active" },
  exhausted: { tone: "grey", label: "No credits left" },
  expired: { tone: "orange", label: "Expired" },
  none: { tone: "grey", label: "No active plan" },
};

function PaymentStatusPill({ status }: { status: string }) {
  const tone = status === "paid" ? "green" : status === "failed" ? "orange" : "grey";
  return <Pill tone={tone}>{status.charAt(0).toUpperCase() + status.slice(1)}</Pill>;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;

/** Show only the head and tail of a reference unless the backend already masked it. */
function maskReference(ref: string): string {
  if (/[•…*]/.test(ref) || ref.length <= 12) return ref;
  return `${ref.slice(0, 4)}…${ref.slice(-6)}`;
}

function ReceiptLink({ url, date }: { url: string | null; date: string }) {
  if (!url) return <span className="text-[#9CA3AF]">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Download receipt PDF for ${formatDate(date, "short")} (opens in a new tab)`}
      className={LINK}
    >
      <FileText size={14} aria-hidden />
      PDF
    </a>
  );
}

/* ----------------------------- layout shells ----------------------------- */

/** Section 1 grid; shared by the loaded and skeleton states so nothing shifts. */
function PlanGrid({ current, details, included }: Record<"current" | "details" | "included", React.ReactNode>) {
  return (
    <div className={`grid grid-cols-1 border-b sm:grid-cols-2 lg:grid-cols-3 ${BORDER}`}>
      <section
        aria-labelledby="plan-current"
        className={`min-w-0 border-b p-5 sm:col-span-2 sm:p-6 lg:col-span-1 lg:border-b-0 lg:border-r ${BORDER}`}
      >
        {current}
      </section>
      <section
        aria-labelledby="plan-details"
        className={`min-w-0 border-b p-5 sm:border-b-0 sm:border-r sm:p-6 ${BORDER}`}
      >
        {details}
      </section>
      <section aria-labelledby="plan-included" className="min-w-0 p-5 sm:p-6">
        {included}
      </section>
    </div>
  );
}

function TableSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`border-b p-5 last:border-b-0 sm:p-6 ${BORDER}`}>
      <h3 className="mb-3 text-[15px] font-semibold text-[#111827]">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs text-[#6B7280]">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-medium text-[#111827]">{children}</dd>
    </div>
  );
}

/* ------------------------------- loaded state ----------------------------- */

function CurrentPlan({ plan }: { plan: Plan }) {
  const status = PLAN_STATUS[plan.status] ?? PLAN_STATUS.none;
  const pct =
    plan.creditsTotal > 0
      ? Math.min(100, Math.max(0, (plan.creditsUsed / plan.creditsTotal) * 100))
      : 0;

  return (
    <>
      <h3 id="plan-current" className={LABEL}>
        Current plan
      </h3>
      <div className="mt-3">
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>
      <p className="mt-3 break-words text-[22px] font-bold leading-tight text-[#111827] lg:text-[26px]">
        {plan.name}
      </p>
      <p className="mt-3 flex items-baseline gap-2 text-[#111827]">
        <span className="text-[40px] font-bold leading-none">{plan.creditsRemaining}</span>
        <span className="text-sm text-[#374151]">
          {plural(plan.creditsRemaining, "credit")} remaining
        </span>
      </p>
      <div
        role="progressbar"
        aria-label="Credits used"
        aria-valuemin={0}
        aria-valuemax={plan.creditsTotal}
        aria-valuenow={plan.creditsUsed}
        className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#E9EDF3]"
      >
        <div className="h-full rounded-full bg-[#2557D6]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-[#374151]">
        {plan.creditsUsed} of {plan.creditsTotal} used
      </p>
      <p className="mt-3 text-xs text-[#6B7280]">
        Purchased {formatDate(plan.purchasedAt, "short")}
        {plan.expiresAt && <> · Expires {formatDate(plan.expiresAt, "short")}</>}
      </p>
    </>
  );
}

function PurchaseDetails({ payment }: { payment: Payment | null }) {
  const dash = <span className="text-[#9CA3AF]">—</span>;
  return (
    <>
      <h3 id="plan-details" className={LABEL}>
        Purchase details
      </h3>
      <dl className="mt-3 divide-y divide-[#EEF0F4]">
        <Row label="Amount paid">
          {payment ? (
            <span className="inline-flex flex-wrap items-center justify-end gap-2">
              {formatMoney(payment.amount, payment.currency)}
              {payment.status !== "paid" && <PaymentStatusPill status={payment.status} />}
            </span>
          ) : (
            dash
          )}
        </Row>
        <Row label="Purchased on">{payment ? formatDate(payment.paidAt, "short") : dash}</Row>
        <Row label="Payment method">
          {payment?.cardBrand || payment?.cardLast4 ? (
            <span className="flex min-w-0 items-center justify-end gap-2">
              {payment.cardBrand && (
                <span className="shrink-0 rounded border border-[#E6E9EF] bg-[#F9FAFB] px-1.5 py-0.5 text-[11px] font-semibold text-[#374151]">
                  {capitalize(payment.cardBrand)}
                </span>
              )}
              {payment.cardLast4 && <span className="truncate">•••• {payment.cardLast4}</span>}
            </span>
          ) : (
            dash
          )}
        </Row>
        <Row label="Receipt sent to">
          {payment?.receiptEmail ? (
            <span className="break-all">{payment.receiptEmail}</span>
          ) : (
            dash
          )}
        </Row>
        <Row label="Reference">
          {payment?.reference ? (
            <span className="break-all font-mono text-xs">{maskReference(payment.reference)}</span>
          ) : (
            dash
          )}
        </Row>
      </dl>
    </>
  );
}

function Included({ features }: { features: string[] }) {
  return (
    <>
      <h3 id="plan-included" className={LABEL}>
        Included in your plan
      </h3>
      {features.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-[13px] text-[#374151]">
              <Check
                size={16}
                strokeWidth={2.5}
                className="mt-px shrink-0 text-[#16A34A]"
                aria-hidden
              />
              <span className="min-w-0 break-words">{feature}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] text-[#9CA3AF]">—</p>
      )}
    </>
  );
}

const TH = `px-3 py-2 text-left ${LABEL}`;
const TD = "px-3 py-2.5 align-middle text-[13px] text-[#374151]";

function PurchaseHistory({ purchases }: { purchases: BillingDetails["purchases"] }) {
  if (purchases.length === 0) {
    return <p className="text-[13px] text-[#6B7280]">No purchases yet.</p>;
  }
  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[520px] border-collapse">
          <caption className="sr-only">Purchase history</caption>
          <thead>
            <tr className={`border-b ${BORDER}`}>
              <th scope="col" className={TH}>Date</th>
              <th scope="col" className={TH}>Plan</th>
              <th scope="col" className={TH}>Credits</th>
              <th scope="col" className={TH}>Amount</th>
              <th scope="col" className={TH}>Status</th>
              <th scope="col" className={TH}>Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF0F4]">
            {purchases.map((p) => (
              <tr key={p.id}>
                <td className={`${TD} whitespace-nowrap`}>{formatDate(p.date, "short")}</td>
                <td className={`${TD} font-medium text-[#111827]`}>{p.planName}</td>
                <td className={TD}>{p.credits}</td>
                <td className={`${TD} whitespace-nowrap`}>{formatMoney(p.amount, p.currency)}</td>
                <td className={TD}><PaymentStatusPill status={p.status} /></td>
                <td className={TD}><ReceiptLink url={p.receiptUrl} date={p.date} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 sm:hidden">
        {purchases.map((p) => (
          <li key={p.id} className={`rounded-[10px] border p-3.5 ${BORDER}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words text-sm font-semibold text-[#111827]">
                {p.planName}
              </span>
              <PaymentStatusPill status={p.status} />
            </div>
            <dl className="mt-2 divide-y divide-[#EEF0F4]">
              <Row label="Date">{formatDate(p.date, "short")}</Row>
              <Row label="Credits">{p.credits}</Row>
              <Row label="Amount">{formatMoney(p.amount, p.currency)}</Row>
              <Row label="Receipt">
                <ReceiptLink url={p.receiptUrl} date={p.date} />
              </Row>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

function CreditUsage({ usage }: { usage: BillingDetails["creditUsage"] }) {
  if (usage.length === 0) {
    return (
      <p className="text-[13px] text-[#6B7280]">
        No credits used yet.{" "}
        <Link href="/compare" className="font-medium text-[#2557D6] hover:underline">
          Generate your first report
        </Link>
      </p>
    );
  }
  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse">
          <caption className="sr-only">Credit usage</caption>
          <thead>
            <tr className={`border-b ${BORDER}`}>
              <th scope="col" className={TH}>Date</th>
              <th scope="col" className={TH}>Description</th>
              <th scope="col" className={`${TH} text-right`}>Credits used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EEF0F4]">
            {usage.map((u) => (
              <tr key={u.id}>
                <td className={`${TD} whitespace-nowrap`}>{formatDate(u.date, "short")}</td>
                <td className={TD}>{u.description}</td>
                <td className={`${TD} text-right font-medium text-[#111827]`}>
                  −{Math.abs(u.credits)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 sm:hidden">
        {usage.map((u) => (
          <li key={u.id} className={`rounded-[10px] border p-3.5 ${BORDER}`}>
            <dl className="divide-y divide-[#EEF0F4]">
              <Row label="Date">{formatDate(u.date, "short")}</Row>
              <Row label="Description">
                <span className="break-words">{u.description}</span>
              </Row>
              <Row label="Credits used">−{Math.abs(u.credits)}</Row>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function PlanBillingContent({ data }: { data: BillingDetails }) {
  const { currentPlan, lastPayment, purchases, creditUsage } = data;

  if (!currentPlan) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center px-5 py-12 text-center">
        <p className="text-base font-semibold text-[#111827]">
          You haven&apos;t purchased a plan yet
        </p>
        <Link href="/pricing" className={`${LINK} mt-2 text-sm`}>
          View pricing →
        </Link>
      </div>
    );
  }

  return (
    <>
      <PlanGrid
        current={<CurrentPlan plan={currentPlan} />}
        details={<PurchaseDetails payment={lastPayment} />}
        included={<Included features={currentPlan.features} />}
      />
      <TableSection title="Purchase history">
        <PurchaseHistory purchases={purchases} />
      </TableSection>
      <TableSection title="Credit usage">
        <CreditUsage usage={creditUsage} />
      </TableSection>
    </>
  );
}

/* ------------------------- skeleton & error states ------------------------ */

function Bar({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-[#E9EDF3] motion-reduce:animate-none ${className}`}
    />
  );
}

export function PlanBillingSkeleton() {
  return (
    <div role="status" aria-label="Loading plan and billing details">
      <PlanGrid
        current={
          <>
            <Bar className="h-3 w-24" />
            <Bar className="mt-4 h-6 w-20 !rounded-full" />
            <Bar className="mt-3 h-8 w-40" />
            <Bar className="mt-4 h-10 w-32" />
            <Bar className="mt-4 h-2 w-full !rounded-full" />
            <Bar className="mt-2 h-3 w-24" />
            <Bar className="mt-4 h-3 w-44" />
          </>
        }
        details={
          <>
            <Bar className="h-3 w-28" />
            <div className="mt-3 space-y-3.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Bar key={i} className="h-4 w-full" />
              ))}
            </div>
          </>
        }
        included={
          <>
            <Bar className="h-3 w-36" />
            <div className="mt-3 space-y-3.5">
              {Array.from({ length: 4 }, (_, i) => (
                <Bar key={i} className="h-4 w-4/5" />
              ))}
            </div>
          </>
        }
      />
      {["Purchase history", "Credit usage"].map((title) => (
        <TableSection key={title} title={title}>
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Bar key={i} className="h-9 w-full" />
            ))}
          </div>
        </TableSection>
      ))}
    </div>
  );
}

export function PlanBillingError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex min-h-[260px] flex-col items-center justify-center gap-4 px-5 py-12 text-center"
    >
      <p className="text-sm text-[#374151]">
        We couldn&apos;t load your billing details. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 cursor-pointer rounded-lg bg-[#2557D6] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#1a3fa3]"
      >
        Try again
      </button>
    </div>
  );
}
