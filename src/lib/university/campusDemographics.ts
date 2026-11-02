/**
 * Student / faculty gender split exactly as the university page's
 * "Campus & Students" tab shows it. Shared with the compare page's college
 * details modal so the two can never drift apart.
 */
import type { CampusData } from "@/types/university/CampusStudentsTab";

type Loose = number | string | null | undefined;

/** 0–1 fractions are scaled to a percentage; values already ≥ 2 are kept. */
const toPct = (val: Loose): number | null => {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return n < 2 ? n * 100 : n;
};

export function deriveCampusDemographics(campusData: CampusData | null) {
  const students = campusData?.students;
  return {
    menStudentsPct: toPct(students?.demographics?.men),
    womenStudentsPct: toPct(students?.demographics?.women),
    menFacultyPct: toPct(students?.faculty?.men),
    womenFacultyPct: toPct(students?.faculty?.women),
  };
}
