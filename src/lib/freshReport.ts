/**
 * One-shot hand-off from Compare to the profile's My Reports section: Compare
 * notes the report it just generated, My Reports reads (and clears) it on load
 * to briefly highlight that report. Session storage only — a page refresh or
 * a later visit never re-highlights.
 */
const KEY = "usd:fresh-report-id";

export function markFreshReport(reportId: string): void {
  try {
    sessionStorage.setItem(KEY, reportId);
  } catch {
    // Storage unavailable — the highlight is a nicety, skip it.
  }
}

/** Returns the freshly generated report id once, then forgets it. */
export function consumeFreshReport(): string | null {
  try {
    const id = sessionStorage.getItem(KEY);
    if (id) sessionStorage.removeItem(KEY);
    return id;
  } catch {
    return null;
  }
}
