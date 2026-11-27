import type { College } from "@/types/university/ComparisonTable";
import { normalizeField } from "@/lib/academicAlignment";

/**
 * 2-digit CIP family (e.g. "51" Health, "52" Business) for a compared
 * college's program, or null when it has no program / CIP data. Prefers the
 * backend-resolved CIP, falling back to the matrix entry's own code.
 * Undotted codes that lost a leading zero ("301" -> "0301") are re-padded
 * before normalizing.
 */
export function programFamily(college: College): string | null {
  const raw = (college.programCipCode || college.cipCode || "").trim();
  if (!raw || raw === "default") return null;
  const padded =
    /^\d+$/.test(raw) && raw.length % 2 === 1 ? raw.padStart(raw.length + 1, "0") : raw;
  return normalizeField(padded);
}

/** True when at least two compared colleges have programs in different CIP families. */
export function programsDiffer(colleges: College[]): boolean {
  const families = new Set<string>();
  for (const c of colleges) {
    const f = programFamily(c);
    if (f) families.add(f);
  }
  return families.size >= 2;
}
