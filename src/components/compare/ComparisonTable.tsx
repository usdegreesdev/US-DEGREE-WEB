"use client";

import { useSyncExternalStore } from "react";
import { College } from "@/types/university/ComparisonTable";
import DesktopComparisonTable from "./desktop/DesktopComparisonTable";
import MobileComparisonView from "./mobile/MobileComparisonView";

// Matches the "md" breakpoint the two views' own `hidden md:block` /
// `block md:hidden` classes used to key off of.
const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

function subscribeToDesktopQuery(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_MEDIA_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getIsDesktop() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

// No viewport to check on the server — default to desktop.
function getServerIsDesktop() {
  return true;
}

interface ComparisonTableProps {
  comparedColleges: College[];
  averages: { tuition: number | null; graduationRate: number | null; medianSalary: number | null };
  highlights: {
    lowestTuitionId: string;
    highestGraduationId: string;
    highestSalaryId: string;
    bestValueId: string;
  };
  onRemove: (id: string) => void;
  removingIds?: Set<string>;
  onViewDetails: (id: string) => void;
}

/**
 * Shows the compared colleges side by side: a full table on tablet/desktop
 * (DesktopComparisonTable) and a stack of scrollable cards on phones
 * (MobileComparisonView). Both read from the same `comparedColleges` data.
 *
 * Only one tree is ever mounted (matched against the same "md" breakpoint
 * the two views' CSS used to hide/show by) rather than mounting both and
 * relying on CSS `hidden` to pick one — that meant every row/section
 * component, and everything it fetches or subscribes to, ran twice on
 * every render.
 */
export default function ComparisonTable(props: ComparisonTableProps) {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopQuery,
    getIsDesktop,
    getServerIsDesktop,
  );

  return isDesktop ? (
    <DesktopComparisonTable {...props} />
  ) : (
    <MobileComparisonView {...props} />
  );
}
