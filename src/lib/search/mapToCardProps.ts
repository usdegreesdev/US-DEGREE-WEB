import { SearchResult } from "@/types/search-details";
import { getCollegeType } from "./searchFilters";
import { formatPercent } from "@/lib/fieldScale";

const hasValue = (value: number | string | null | undefined) =>
  value !== null && value !== undefined;

// Map a raw API SearchResult into the props shared by ResultCard / TileCard.
export const mapToCardProps = (result: SearchResult) => ({
  id: result.unitid,
  unitid: result.unitid != null ? String(result.unitid) : undefined,
  cipCode: result.cip_code,
  credentialLevel: result.credential_level,
  university: result.school_name || "Unknown University",
  location: `${result.city || "Unknown"}, ${result.state || "US"}`,
  degree: result.program_title || "Unknown Degree",
  schoolType: getCollegeType(result) || "Unknown",
  admissionRate: hasValue(result.admission_rate)
    ? formatPercent("admissions.admission_rate", result.admission_rate, 1)
    : "N/A",
  satAct:
    hasValue(result.school_min_range) && hasValue(result.school_max_range)
      ? `${result.school_min_range} - ${result.school_max_range}`
      : "N/A",
  specializations: result.credential_title || "N/A",
  avgSalary: hasValue(result.earnings_year_5)
    ? `$${Math.round(Number(result.earnings_year_5)).toLocaleString()}`
    : undefined,
  // Prefer the full sticker price (tuition + books + room/board + other
  // expenses, precomputed by the backend); fall back to tuition alone when a
  // school has no sticker-price record yet.
  estCost: hasValue(result.sticker_price)
    ? `$${Math.round(Number(result.sticker_price)).toLocaleString()}`
    : undefined,
  medianSalary: hasValue(result.earnings_year_5)
    ? `$${Math.round(Number(result.earnings_year_5)).toLocaleString()}`
    : undefined,
  roi: hasValue(result.roi_20yr)
    ? `$${Math.round(Number(result.roi_20yr) / 1000)}K`
    : undefined,
  logoColor: "bg-blue-600",
  schoolUrl: result.school_url,
});
