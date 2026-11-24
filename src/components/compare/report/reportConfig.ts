import type { DegreeCode } from "@/lib/academicAlignment";

// Below this, we ask the user to finish their profile before generating a
// report so the AI has enough signal (academics + preferences) to personalize it.
export const MIN_PROFILE_COMPLETION_FOR_REPORT = 90;

// Each step owns a slice of the progress bar. The bar eases toward the current
// step's ceiling and parks there until the next step starts, so it always
// creeps forward without ever pretending to be finished — the real completion
// (100%) only comes from the API response.
export const GENERATION_STEPS: { label: string; ceiling: number }[] = [
  { label: "Analyzing your profile", ceiling: 18 },
  { label: "Gathering college data", ceiling: 40 },
  { label: "Generating AI insights", ceiling: 65 },
  { label: "Building your report", ceiling: 84 },
  { label: "Finalizing PDF", ceiling: 95 },
];

export const STEP_DURATION_MS = 2000;
export const PROGRESS_TICK_MS = 60;

export const SELECT_COLLEGES_WARNING =
  "Please select at least two college to compare before generating a report.";

// Display names for the normalized degree buckets (labels only).
export const DEGREE_LABEL: Record<DegreeCode, string> = {
  certificate: "Certificate",
  associate: "Associate's",
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: "Doctorate",
};
