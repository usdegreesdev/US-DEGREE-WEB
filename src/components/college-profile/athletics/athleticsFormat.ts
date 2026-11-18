import { NOT_PUBLISHED } from "@/lib/notPublished";

// A malformed (non-finite) value is missing, never 0 / "$0".
const toFiniteNumber = (val: number | null | undefined): number | null => {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
};

export const formatCurrency = (val: number | null | undefined): string => {
  const num = toFiniteNumber(val);
  if (num === null) return NOT_PUBLISHED;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatCurrencyAbbreviated = (
  val: number | null | undefined,
): string => {
  const num = toFiniteNumber(val);
  if (num === null) return NOT_PUBLISHED;
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(num / 1_000)}K`;
  return formatCurrency(num);
};

export const formatNumber = (val: number | null | undefined): string => {
  const num = toFiniteNumber(val);
  if (num === null) return NOT_PUBLISHED;
  return new Intl.NumberFormat("en-US").format(num);
};
