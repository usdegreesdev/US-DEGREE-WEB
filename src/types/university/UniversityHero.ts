import { TuitionData } from "./TuitionData";

export interface UniversityHeroProps {
  id?: string | number;
  name: string;
  location: string;
  type: string | null;
  admissionRate: string;
  /** Sticker price display string, or null when not published. */
  tuitionFee: string | null;
  logoColor: string;
  tuitionData?: TuitionData | null;
  tuitionType?: "in_state" | "out_state";
  schoolUrl?: string | null;
  accreditor?: string | null;
  cipCode?: string | null;
  degree?: string | null;
  /** IPEDS credential level (e.g. 5/7/17), disambiguating this program's
   * cip_code from another credential level of the same course. */
  credentialLevel?: number | null;
  /** Human-readable credential title (e.g. "Doctoral Degree"), shown as a
   * badge on the compare page. */
  credentialTitle?: string | null;
}
