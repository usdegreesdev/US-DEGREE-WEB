import { headers } from "next/headers";

import { getBackendBaseUrl } from "@/lib/env";
import { clientIpHeaders } from "@/lib/clientIp";
import { TuitionData } from "@/types/university/TuitionData";
import { AthleticsData } from "@/types/university/AthleticsData";
import { CampusData } from "@/types/university/CampusStudentsTab";
import {
  ApiCollege,
  ApiOutcomes,
  ApiOverview,
  ApiPrograms,
} from "@/types/university/apiResponses";

// Fetch + parse JSON, swallowing failures so a single dead endpoint never
// takes down the whole page. Logs with the caller-provided context on error.
async function fetchJson<T>(
  url: string,
  errorContext: string,
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: clientIpHeaders(await headers()),
    });
    if (res.ok) {
      return (await res.json()) as T;
    }
  } catch (err) {
    console.error(errorContext, err);
  }
  return null;
}

export interface UniversityApiBundle {
  apiData: ApiOverview | null;
  outcomesData: ApiOutcomes | null;
  campusData: CampusData | null;
  tuitionData: TuitionData | null;
  collegeData: ApiCollege | null;
  programsData: ApiPrograms | null;
  fetchedAccreditor: string | null;
  resolvedCip: string | undefined;
  athleticsData: AthleticsData | null;
}

export async function fetchUniversityData(
  id: string,
  cip: string | undefined,
  // The same cip_code can be offered at more than one credential level at a
  // school (e.g. a Bachelor's and a Doctoral program both filed under the
  // same CIP) — /overview and /outcomes otherwise silently return whichever
  // level's row comes back first (observed: always the lowest level), so a
  // program picked for its credential level (e.g. "Doctoral Degree") would
  // render with the wrong Course Summary / Education Level info. Passing
  // credential_title disambiguates; an unrecognized value is safely ignored
  // by the backend and falls back to prior (single-row) behavior.
  credentialTitle: string | undefined,
): Promise<UniversityApiBundle> {
  const apiUrl = getBackendBaseUrl();
  const credentialQuery = credentialTitle
    ? `?credential_title=${encodeURIComponent(credentialTitle)}`
    : "";

  // 1. Overview first — outcomes needs its resolved cip_code, so it can't
  // join the parallel batch below.
  const apiData = cip
    ? await fetchJson<ApiOverview>(
        `${apiUrl}/overview/${id}/${cip}${credentialQuery}`,
        "Error fetching overview details:",
      )
    : await fetchJson<ApiOverview>(
        `${apiUrl}/overview/${id}/default${credentialQuery}`,
        "Error fetching overview details with default cip:",
      );

  const resolvedCip = cip || apiData?.program?.cip_code;

  // 2. Every other endpoint is independent of the others — run them
  // together instead of one at a time.
  const [
    outcomesData,
    campusData,
    tuitionData,
    collegeData,
    programsData,
    athleticsData,
  ] = await Promise.all([
    resolvedCip
      ? fetchJson<ApiOutcomes>(
          `${apiUrl}/outcomes/${id}/${resolvedCip}${credentialQuery}`,
          "Error fetching outcomes details:",
        )
      : Promise.resolve<ApiOutcomes | null>(null),
    fetchJson<CampusData>(
      `${apiUrl}/campus/${id}`,
      "Error fetching campus details:",
    ),
    fetchJson<TuitionData>(
      `${apiUrl}/tuition/${id}`,
      "Error fetching tuition details:",
    ),
    fetchJson<ApiCollege>(
      `${apiUrl}/colleges/${id}`,
      "Error fetching college details:",
    ),
    fetchJson<ApiPrograms>(
      `${apiUrl}/programs/${id}`,
      "Error fetching programs details:",
    ),
    fetchJson<AthleticsData>(
      `${apiUrl}/colleges/${id}/athletics`,
      "Error fetching athletics details:",
    ),
  ]);

  // Accreditor comes from the college/overview payloads directly now — no
  // longer worth downloading the entire university catalog
  // (`/search?type=universities`) just to look up one field by unitid.
  // `fetchedAccreditor` stays null when neither payload has it; the UI
  // renders without an accreditor rather than paying for the full-catalog
  // fetch.
  const fetchedAccreditor =
    collegeData?.accreditor || apiData?.school?.accreditor || null;

  return {
    apiData,
    outcomesData,
    campusData,
    tuitionData,
    collegeData,
    programsData,
    fetchedAccreditor,
    resolvedCip,
    athleticsData,
  };
}
