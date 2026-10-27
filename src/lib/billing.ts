/** Stripe amounts are in minor units; zero-decimal currencies (JPY) have none. */
export function formatMoney(amountMinor: number, currency: string): string {
  const code = currency.toUpperCase();
  try {
    const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: code });
    const digits = fmt.resolvedOptions().maximumFractionDigits ?? 2;
    return fmt.format(amountMinor / 10 ** digits);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${code}`;
  }
}

/** "MMMM d, yyyy" → November 22, 2026 · "MMM d, yyyy" → Nov 22, 2026 (US format). */
export function formatDate(iso: string, month: "long" | "short"): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Intl.DateTimeFormat("en-US", { month, day: "numeric", year: "numeric" }).format(t);
}

export function creditsLabel(n: number): string {
  return `${n} report credit${n === 1 ? "" : "s"}`;
}
