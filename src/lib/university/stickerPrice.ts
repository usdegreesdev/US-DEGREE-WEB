import { NOT_PUBLISHED } from "@/lib/university/outcomeFormat";

/**
 * Sticker price = the sum of its published cost components. Mirrors the PDF
 * report (usdegrees-api src/report/utils/stickerPrice.ts), including the
 * component names, so both surfaces say the same thing:
 *
 * - every component present → the total;
 * - any component missing → no total, and the missing components are named.
 *
 * A missing component is never 0 and never a constant; a real 0 is a value.
 * Never reads costs.for_roi_data, whose trigger counts empty components as 0.
 */
export type StickerTotal =
  | { published: true; total: number; missing: [] }
  | { published: false; total: null; missing: string[] };

type Component = number | string | null | undefined;

const toFinite = (v: Component): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function sumStickerComponents(
  parts: ReadonlyArray<readonly [label: string, value: Component]>,
): StickerTotal {
  const values = parts.map(([label, v]) => [label, toFinite(v)] as const);
  const missing = values.filter(([, v]) => v === null).map(([label]) => label);
  if (missing.length > 0) return { published: false, total: null, missing };
  const total = Math.round(
    values.reduce((sum, [, v]) => sum + (v as number), 0),
  );
  return { published: true, total, missing: [] };
}

export interface InStateOnCampusComponents {
  tuition_in_state?: Component;
  roomboard_oncampus?: Component;
  booksupply?: Component;
  otherexpense_oncampus?: Component;
}

/** In-state tuition + on-campus room and board + books + on-campus other. */
export function inStateOnCampusSticker(
  c: InStateOnCampusComponents,
): StickerTotal {
  return sumStickerComponents([
    ["in-state tuition", c.tuition_in_state],
    ["on-campus room and board", c.roomboard_oncampus],
    ["books and supplies", c.booksupply],
    ["on-campus other expenses", c.otherexpense_oncampus],
  ]);
}

/** "$24,094", or "Not published (missing: books and supplies)". */
export function stickerDisplay(s: StickerTotal): string {
  return s.published
    ? `$${s.total.toLocaleString("en-US")}`
    : notPublishedReason(s.missing);
}

/** "Not published (missing: a, b)" — or plain "Not published" with no list. */
export function notPublishedReason(missing: readonly string[]): string {
  return missing.length > 0
    ? `${NOT_PUBLISHED} (missing: ${missing.join(", ")})`
    : NOT_PUBLISHED;
}
