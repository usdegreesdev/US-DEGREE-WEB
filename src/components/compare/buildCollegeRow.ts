import type { College } from "@/types/university/ComparisonTable";
import { resolveSalaryValue, type SelectedCompareCollege } from "@/lib/auth/api";
import { parseEntryId } from "./compareEntryIds";
import type { EntryProgramInfo } from "./compareEntryIds";
import type { RawUniversity, StoredDetail, UniOption } from "./compareCollegeTypes";
import { toSafeHttpUrl } from "@/lib/url/httpUrl";

// academics.graduationRate arrives as an already-scaled percentage (e.g.
// 31.69); College.graduationRate is a fraction, matching acceptanceRate and
// every renderer in desktop/rows + mobile/sections that does `rate * 100`.
function toFraction(percent: number | null | undefined): number | null {
  return percent === null || percent === undefined ? null : percent / 100;
}

function deriveLogo(schoolUrl: string | null): string {
  const safeUrl = toSafeHttpUrl(schoolUrl);
  if (!safeUrl) return "";
  return `https://logo.clearbit.com/${new URL(safeUrl).hostname}`;
}

interface BuildContext {
  // Keyed by entryId (bare unitid, or unitid~cipCode~credentialLevel) — one
  // row per compare-matrix entry from a single GET /compare/matrix/details
  // call. Each row's `selectedProgram` is already resolved from THAT entry's
  // own cipCode/credentialLevel — no per-program round trip needed, and no
  // ambiguity when the same college appears twice under different programs.
  baseByEntryId: Map<string, SelectedCompareCollege>;
  storedDetails: StoredDetail[];
  entryProgramsMap: Record<string, EntryProgramInfo>;
  allUniversities: Map<string, UniOption>;
  cacheUniversity: (uni: RawUniversity) => UniOption | null;
}

/**
 * Build one comparison-table row from the already-fetched
 * `/compare/matrix/details` data. Never throws and never returns null — if
 * the backend's set hasn't caught up with a just-added college yet, the row
 * renders with cached name/location and N/A metrics rather than disappearing,
 * and self-heals on the next fetch.
 */
export function buildCollegeRow(entryId: string, ctx: BuildContext): College {
  const { unitid, cipCode: entryCipCode } = parseEntryId(entryId);
  const base = ctx.baseByEntryId.get(entryId);
  const isBareEntry = entryId === unitid;
  const matchedStored = ctx.storedDetails.find(
    (d) => String(d.id) === unitid,
  );

  const cipCode = isBareEntry
    ? matchedStored?.cipCode || "default"
    : entryCipCode;
  const programInfo = ctx.entryProgramsMap[entryId];
  const selectedProgram = base?.programs?.selectedProgram ?? undefined;
  const programName =
    cipCode === "default"
      ? ""
      : programInfo?.programName || selectedProgram?.title || "";
  const credentialTitle =
    cipCode === "default" ? "" : programInfo?.credentialTitle || "";

  const matchedUni =
    ctx.allUniversities.get(unitid) || matchedStored;
  const name =
    base?.name || matchedUni?.name || programInfo?.name || "Unknown University";
  const location =
    base?.location ||
    (matchedStored?.city && matchedStored?.state
      ? `${matchedStored.city}, ${matchedStored.state}`
      : matchedStored?.location) ||
    programInfo?.location ||
    "Unknown";
  const [city = "", state = ""] = location.split(",").map((s) => s.trim());
  const schoolType =
    base?.schoolType || matchedStored?.schoolType || programInfo?.schoolType || "Public";
  const isPrivate = schoolType.toLowerCase().includes("private");
  const schoolUrl =
    base?.schoolUrl || matchedStored?.schoolUrl || programInfo?.schoolUrl || undefined;

  ctx.cacheUniversity({
    unitid,
    school_name: name,
    city,
    state,
    school_type: schoolType,
  });

  return {
    id: entryId,
    unitid,
    name,
    shortName: name
      .replace("University", "")
      .replace("Institute of Technology", "")
      .trim(),
    logo: deriveLogo(schoolUrl ?? null),
    state,
    location,
    isPrivate,
    tuitionInState: base?.tuitionInState ?? null,
    tuitionOutOfState: base?.cost?.tuitionOutState ?? null,
    acceptanceRate: base?.acceptanceRate ?? null,
    satMin: base?.academics?.satRangeLow ?? null,
    satMax: base?.academics?.satRangeHigh ?? null,
    graduationRate: toFraction(base?.academics?.graduationRate),
    medianSalary:
      resolveSalaryValue(selectedProgram?.earnings) ??
      resolveSalaryValue(base?.outcomes?.avgSalary) ??
      null,
    studentPopulation: base?.students?.size ?? null,
    image:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop",
    schoolUrl,
    cipCode,
    programName: programName || undefined,
    credentialTitle: credentialTitle || undefined,
  };
}
