import type { AdmissionsGlanceInput } from "@/lib/university/admissionsGlance";

/**
 * Backend-provided color token for the testing-requirements badge. Mapped to the
 * app's existing Tailwind pill classes in AdmissionsTabContent — never to raw hex.
 */
export type TestingBadgeColor =
  | "green"
  | "slate_blue_gray"
  | "teal"
  | "amber_outline"
  | "coral"
  | "gray";

/**
 * Testing-requirements disclosure for a single college, as delivered by the
 * backend. The backend already suppresses non-publishable rows (Tier 3), so the
 * frontend only decides *how* to render, gated on `satDisclosureCategory`.
 */
export interface TestingRequirementsDisclosure {
  /** Non-null ⇒ this row is publishable and the badge may render. */
  satDisclosureCategory: string | null;
  badgeLabel: string;
  badgeColor: TestingBadgeColor;
  supportingCopy: string;
  /** 1 → tooltip on an info icon, 2 → always-visible line, 3 → never reaches us. */
  disclaimerTier: 1 | 2 | 3;
  disclaimerText: string | null;
  /** When true, the acceptance rate stat MUST render alongside the badge. */
  showAdmissionRateRequired: boolean;
}

export interface AdmissionsTabContentProps {
  admissions: AdmissionsGlanceInput | null | undefined;
}
