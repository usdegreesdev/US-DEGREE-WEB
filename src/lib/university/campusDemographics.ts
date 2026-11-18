/**
 * Student / faculty gender split exactly as the university page's
 * "Campus & Students" tab shows it. Shared with the compare page's college
 * details modal so the two can never drift apart.
 */
import type { CampusData } from "@/types/university/CampusStudentsTab";
import { toPercent } from "@/lib/fieldScale";

// Scales are declared in lib/fieldScale, never guessed: GET /campus serves
// demographics already as a 0–100 percent, and faculty as raw 0–1 fractions.
export function deriveCampusDemographics(campusData: CampusData | null) {
  const students = campusData?.students;
  return {
    menStudentsPct: toPercent("campus.demographics_men", students?.demographics?.men),
    womenStudentsPct: toPercent(
      "campus.demographics_women",
      students?.demographics?.women,
    ),
    menFacultyPct: toPercent("students.faculty_men", students?.faculty?.men),
    womenFacultyPct: toPercent("students.faculty_women", students?.faculty?.women),
  };
}
