/**
 * Static UI option lists for profile forms.
 *
 * NOTE: states and degree levels are NOT here — those come from the live
 * backend (GET /states, GET /degree-levels) via src/lib/referenceData.ts.
 * These two lists have no backend endpoint in the current contract, so they
 * remain frontend constants (flagged for a future reference endpoint). They are
 * option lists, not fabricated user/profile data.
 */

export const PROGRAM_OPTIONS = [
  { label: "Accounting", searchTerm: "Accounting" },
  { label: "Aerospace Engineering", searchTerm: "Aerospace" },
  { label: "Agriculture", searchTerm: "Agriculture" },
  { label: "Anthropology", searchTerm: "Anthropology" },
  { label: "Architecture", searchTerm: "Architecture" },
  { label: "Automotive Technology", searchTerm: "Vehicle Maintenance" },
  { label: "Aviation", searchTerm: "Air Transportation" },
  { label: "Biochemistry", searchTerm: "Biochemistry" },
  { label: "Biomedical Engineering", searchTerm: "Biomedical/Medical Engineering" },
  { label: "Biology", searchTerm: "Biology" },
  { label: "Biotechnology", searchTerm: "Biotechnology" },
  { label: "Business Administration", searchTerm: "Business Administration" },
  { label: "Chemical Engineering", searchTerm: "Chemical Engineering" },
  { label: "Chemistry", searchTerm: "Chemistry" },
  { label: "Civil Engineering", searchTerm: "Civil Engineering" },
  { label: "Communications", searchTerm: "Communication and Media" },
  { label: "Computer Engineering", searchTerm: "Computer Engineering" },
  { label: "Computer Programming", searchTerm: "Computer Programming" },
  { label: "Computer Science", searchTerm: "Computer Science" },
  { label: "Construction Management", searchTerm: "Construction Management" },
  { label: "Criminal Justice", searchTerm: "Criminal Justice" },
  { label: "Culinary", searchTerm: "Culinary" },
  { label: "Data Analytics", searchTerm: "Data Analytics" },
  { label: "Data Science", searchTerm: "Data Science" },
  { label: "Dentistry", searchTerm: "Dentistry" },
  { label: "Economics", searchTerm: "Economics" },
  { label: "Education", searchTerm: "Education, General" },
  { label: "Electrical Engineering", searchTerm: "Electrical, Electronics" },
  { label: "Entrepreneurship", searchTerm: "Entrepreneurial" },
  { label: "English", searchTerm: "English Language" },
  { label: "Environmental Science", searchTerm: "Natural Resources" },
  { label: "Film", searchTerm: "Film" },
  { label: "Finance", searchTerm: "Finance" },
  { label: "Fine Arts", searchTerm: "Fine and Studio Arts" },
  { label: "Graphic Design", searchTerm: "Design and Applied Arts" },
  { label: "Healthcare Administration", searchTerm: "Health and Medical Administrative" },
  { label: "History", searchTerm: "History" },
  { label: "Hospitality", searchTerm: "Hospitality" },
  { label: "Human Resources", searchTerm: "Human Resources" },
  { label: "Industrial Engineering", searchTerm: "Industrial Engineering" },
  { label: "Information Technology", searchTerm: "Information Technology" },
  { label: "International Business", searchTerm: "International Business" },
  { label: "International Relations", searchTerm: "International Relations" },
  { label: "Journalism", searchTerm: "Journalism" },
  { label: "Languages and Linguistics", searchTerm: "Linguistic" },
  { label: "Liberal Arts", searchTerm: "Liberal Arts" },
  { label: "Management Information Systems", searchTerm: "Management Information Systems" },
  { label: "Marketing", searchTerm: "Marketing" },
  { label: "Mathematics", searchTerm: "Mathematics" },
  { label: "Mechanical Engineering", searchTerm: "Mechanical Engineering" },
  { label: "Music", searchTerm: "Music" },
  { label: "Neuroscience", searchTerm: "Neuroscience" },
  { label: "Nursing", searchTerm: "Nursing" },
  { label: "Nutrition", searchTerm: "Nutrition" },
  { label: "Pharmacy", searchTerm: "Pharmacy" },
  { label: "Philosophy", searchTerm: "Philosophy" },
  { label: "Physical Therapy / Rehabilitation", searchTerm: "Rehabilitation and Therapeutic" },
  { label: "Physics", searchTerm: "Physics" },
  { label: "Political Science", searchTerm: "Political Science" },
  { label: "Psychology", searchTerm: "Psychology" },
  { label: "Public Administration", searchTerm: "Public Administration" },
  { label: "Public Health", searchTerm: "Public Health" },
  { label: "Public Policy", searchTerm: "Public Policy" },
  { label: "Public Relations", searchTerm: "Public Relations" },
  { label: "Real Estate", searchTerm: "Real Estate" },
  { label: "Social Work", searchTerm: "Social Work" },
  { label: "Sociology", searchTerm: "Sociology" },
  { label: "Special Education", searchTerm: "Special Education" },
  { label: "Statistics", searchTerm: "Statistics" },
  { label: "Teacher Education", searchTerm: "Teacher Education" },
  { label: "Theatre", searchTerm: "Drama" },
  { label: "Veterinary", searchTerm: "Veterinary" },
];

export function getProgramSearchTerm(label: string): string {
  return (
    PROGRAM_OPTIONS.find((program) => program.label === label)?.searchTerm ??
    label
  );
}

export const DEACTIVATION_REASONS = [
  { value: "1", label: "I found another college platform" },
  { value: "2", label: "I no longer plan to attend college" },
  { value: "3", label: "Privacy concerns" },
  { value: "4", label: "Other" },
];

/** Approximate annual household income slabs: stable id (stored) -> label. */
export const HOUSEHOLD_INCOME_OPTIONS = [
  { value: "0_30000", label: "$0 – $30,000" },
  { value: "30001_48000", label: "$30,001 – $48,000" },
  { value: "48001_75000", label: "$48,001 – $75,000" },
  { value: "75001_110000", label: "$75,001 – $110,000" },
  { value: "110001_plus", label: "$110,001+" },
];
