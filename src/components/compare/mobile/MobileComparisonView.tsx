"use client";

import { College } from "@/types/university/ComparisonTable";
import MobileCollegeCard from "./MobileCollegeCard";
import SignInGate from "../SignInGate";
import ProgramSection from "./sections/ProgramSection";
import TuitionInStateSection from "./sections/TuitionInStateSection";
import TuitionOutOfStateSection from "./sections/TuitionOutOfStateSection";
import AcceptanceRateSection from "./sections/AcceptanceRateSection";
import GraduationRateSection from "./sections/GraduationRateSection";
import SatRangeSection from "./sections/SatRangeSection";
import SalarySection from "./sections/SalarySection";
import EnrollmentSection from "./sections/EnrollmentSection";

interface MobileComparisonViewProps {
  comparedColleges: College[];
  averages: { tuition: number; graduationRate: number; medianSalary: number };
  highlights: {
    lowestTuitionId: string;
    highestGraduationId: string;
    highestSalaryId: string;
    bestValueId: string;
  };
  onRemove: (id: string) => void;
  onViewDetails: (id: string) => void;
}

/**
 * The comparison view shown on phones: a horizontally-scrolling strip of
 * school cards, followed by one stacked card per metric. Only visible
 * below the "md" breakpoint — see DesktopComparisonTable for larger screens.
 */
export default function MobileComparisonView({
  comparedColleges,
  averages,
  highlights,
  onRemove,
  onViewDetails,
}: MobileComparisonViewProps) {
  return (
    <div className="block md:hidden space-y-6">
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-none snap-x snap-mandatory">
        {comparedColleges.map((college) => (
          <MobileCollegeCard
            key={college.id}
            college={college}
            isBestValue={highlights.bestValueId === college.id}
            isHighSalary={highlights.highestSalaryId === college.id}
            isLowestCost={highlights.lowestTuitionId === college.id}
            onRemove={onRemove}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      <SignInGate className="space-y-4">
        <ProgramSection colleges={comparedColleges} onViewDetails={onViewDetails} />
        <TuitionInStateSection colleges={comparedColleges} onViewDetails={onViewDetails} />
        <TuitionOutOfStateSection
          colleges={comparedColleges}
          onViewDetails={onViewDetails}
          averageTuition={averages.tuition}
          lowestTuitionId={highlights.lowestTuitionId}
        />
        <AcceptanceRateSection colleges={comparedColleges} onViewDetails={onViewDetails} />
        <GraduationRateSection
          colleges={comparedColleges}
          onViewDetails={onViewDetails}
          averageGraduationRate={averages.graduationRate}
          highestGraduationId={highlights.highestGraduationId}
        />
        <SatRangeSection colleges={comparedColleges} onViewDetails={onViewDetails} />
        <SalarySection
          colleges={comparedColleges}
          onViewDetails={onViewDetails}
          averageSalary={averages.medianSalary}
          highestSalaryId={highlights.highestSalaryId}
        />
        <EnrollmentSection colleges={comparedColleges} onViewDetails={onViewDetails} />
      </SignInGate>
    </div>
  );
}
