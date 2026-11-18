import type { ComponentProps } from "react";
import type Link from "next/link";

export interface ResultCardProps {
  id?: number | string;
  /** IPEDS UNITID — stable identifier used for saving the college. */
  unitid?: string;
  cipCode?: string;
  /** IPEDS credential level (e.g. 5/7/17), disambiguating this program's
   * cip_code from another credential level of the same course. */
  credentialLevel?: number | null;
  university: string;
  location: string;
  degree: string;
  schoolType?: string;
  admissionRate: string;
  satAct: string;
  specializations: string;
  avgSalary?: string;
  estCost?: string;
  medianSalary?: string;
  roi?: string;
  logoColor: string;
  schoolUrl?: string | null;
}

/** Props shared by the desktop and mobile layouts (presentation only). */
export interface ResultCardViewProps {
  university: string;
  location: string;
  degree: string;
  schoolType?: string;
  admissionRate: string;
  satAct: string;
  specializations: string;
  estCost?: string;
  medianSalary?: string;
  roi?: string;
  logoColor: string;
  /** unitid used to build the R2 logo URL. */
  collegeId?: string;
  universityHref: ComponentProps<typeof Link>["href"];
  formattedSchoolUrl: string | null;
  shouldShowFit: boolean;
  /** The user's calculated fit score, or null until they calculate one —
   *  never a placeholder number. */
  displayScore: number | null;
  isCompared: boolean;
  isSavedCollege: boolean;
  isSaving: boolean;
  onOpenFit: () => void;
  onToggleCompare: () => void;
  onToggleSave: () => void;
}
