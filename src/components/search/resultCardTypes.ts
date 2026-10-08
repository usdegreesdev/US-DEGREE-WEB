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
  avgGpa: string;
  satAct: string;
  duration: string;
  specializations: string;
  matchScore: number;
  gradRate: number;
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
  avgGpa: string;
  satAct: string;
  duration: string;
  specializations: string;
  matchScore: number;
  gradRate: number;
  estCost?: string;
  medianSalary?: string;
  roi?: string;
  logoColor: string;
  universityHref: ComponentProps<typeof Link>["href"];
  formattedSchoolUrl: string | null;
  shouldShowFit: boolean;
  /** Score to display: the user's fit score when calculated, else matchScore. */
  displayScore: number;
  isCompared: boolean;
  isSavedCollege: boolean;
  isSaving: boolean;
  onOpenFit: () => void;
  onToggleCompare: () => void;
  onToggleSave: () => void;
}
