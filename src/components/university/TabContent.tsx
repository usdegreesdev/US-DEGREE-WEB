"use client";

import React, { useEffect, useRef, useState } from "react";
import AboutSection from "./AboutSection";
import StatsGrid from "./StatsGrid";
import ProgramDetail from "./ProgramDetail";
import AdmissionsOverview from "./AdmissionsOverview";
import AdmissionsTabContent from "./AdmissionsTabContent";
import OutcomesSection from "./OutcomesSection";
import CourseSummarySideCard from "./CourseSummarySideCard";
import ProgramSearchBand from "./ProgramSearchBand";
import ProgramsAcademicsTab from "./ProgramsAcademicsTab";
import CampusStudentsTab from "./CampusStudentsTab";
import TuitionCostsSection from "./TuitionCostsSection";
import UniversityHero from "./UniversityHero";
import TrustBanner from "./TrustBanner";
import AthleticsTab from "@/components/college-profile/athletics/AthleticsTab";
import type { UniversityViewData } from "@/lib/university/buildUniversityViewData";

const tabs = [
  "Overview",
  "Programs & Academics",
  "Admissions",
  "Outcomes & Careers",
  "Tuition & Costs",
  "Campus & Students",
  "Athletics",
];

const TABPANEL_ID = "university-tabpanel";
const tabId = (tab: string) =>
  `tab-${tab.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export default function TabContent({ data }: { data: UniversityViewData }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [tuitionType, setTuitionType] = useState<"in_state" | "out_state">(
    "in_state",
  );

  // Keep the active tab centered in the scrollable strip on mobile. Browsers
  // clamp `inline: "center"` at the scroll edges, so the first/last tabs
  // naturally end up flush against their end instead of centered.
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    tabRefs.current[activeTab]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeTab]);

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const nextTab = tabs[(idx + dir + tabs.length) % tabs.length];
    setActiveTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <>
      <UniversityHero
        id={data.id}
        name={data.name}
        location={data.location}
        type={data.type}
        rank={data.rank}
        admissionRate={data.admissionRate}
        tuitionFee={data.tuitionFee}
        logoColor={data.logoColor}
        tuitionData={data.tuitionData}
        tuitionType={tuitionType}
        schoolUrl={data.schoolUrl}
        accreditor={data.accreditor}
        cipCode={data.cipCode}
        degree={data.degree}
        credentialLevel={data.credentialLevel}
        credentialTitle={data.credentialTitle}
      />
      <TrustBanner />

      <div className="sticky top-[50px] z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full max-w-[2380px] mx-auto px-6 sm:px-10 lg:px-[86px]">
          <div
            role="tablist"
            aria-label="University details"
            className="flex items-center gap-8 overflow-x-auto scrollbar-none"
          >
            {tabs.map((tab, idx) => (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[tab] = el;
                }}
                role="tab"
                id={tabId(tab)}
                aria-selected={activeTab === tab}
                aria-controls={TABPANEL_ID}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                className={`relative whitespace-nowrap py-5 text-sm font-bold transition-all duration-200 ${
                  activeTab === tab
                    ? "text-[#2563EB]"
                    : "text-[#64748B] hover:text-gray-900"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#EF4444] rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-[2380px] mx-auto px-6 sm:px-10 lg:px-[86px] py-10 w-full flex flex-col lg:flex-row gap-10">
        <div
          id={TABPANEL_ID}
          role="tabpanel"
          aria-labelledby={tabId(activeTab)}
          tabIndex={0}
          className="flex-1 w-full min-w-0"
        >
          {activeTab === "Overview" && (
            <div className="space-y-10">
              <AboutSection name={data.name} description={data.description} />

              <StatsGrid
                totalStudents={data.totalStudents}
                facultyRatio={data.facultyRatio}
                retentionRate={data.retentionRate}
                programs={data.programs}
                fafsaApplications={data.fafsaApplications}
                completionRate={data.completionRate}
              />

              <ProgramDetail
                degree={data.degree}
                cipCode={data.cipCode}
                description={data.programDescription}
                credentialLevel={data.credentialLevel}
              />

              <AdmissionsOverview
                admissionRate={data.admissionRate}
                applicants={data.applicants}
                satReadingWriting={data.satReadingWriting}
                satMath={data.satMath}
                onViewAdmissions={() => {
                  setActiveTab("Admissions");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                salaryYear1={data.salaryYear1}
                salaryYear10={data.salaryYear10}
                salaryYear1Method={data.salaryYear1Method}
                salaryYear10Method={data.salaryYear10Method}
                netRoi20Yr={data.netRoi20Yr}
                growthRate={data.growthRate}
              />
            </div>
          )}

          {activeTab === "Programs & Academics" && (
            <ProgramsAcademicsTab data={data} />
          )}

          {activeTab === "Admissions" && (
            <AdmissionsTabContent admissions={data.admissionsGlance} />
          )}

          {activeTab === "Outcomes & Careers" && (
            <OutcomesSection
              salaryYear1={data.salaryYear1}
              salaryYear5={data.salaryYear5}
              salaryYear10={data.salaryYear10}
              salaryYear1Method={data.salaryYear1Method}
              salaryYear5Method={data.salaryYear5Method}
              salaryYear10Method={data.salaryYear10Method}
              salaryYear1Cohort={data.salaryYear1Cohort}
              salaryYear5Cohort={data.salaryYear5Cohort}
              salaryYear10Cohort={data.salaryYear10Cohort}
              netRoi20Yr={data.netRoi20Yr}
              growthRate={data.growthRate}
              empFactor={data.empFactor}
              debtIncomeRatio={data.debtIncomeRatio}
              loanPrincipal={data.tuitionData?.financial_aid?.loan_principal}
              avgSalary={data.avgSalary}
            />
          )}

          {activeTab === "Campus & Students" && (
            <CampusStudentsTab
              campusData={data.campusData}
              fafsaApplications={data.fafsaApplications}
            />
          )}

          {activeTab === "Tuition & Costs" && (
            <TuitionCostsSection
              tuitionData={data.tuitionData}
              schoolName={data.name}
              tuitionType={tuitionType}
              setTuitionType={setTuitionType}
            />
          )}

          {activeTab === "Athletics" && (
            <AthleticsTab data={data.athleticsData} />
          )}
        </div>

        <div className="w-full lg:w-[320px] shrink-0 lg:sticky lg:top-[120px] self-start">
          <CourseSummarySideCard
            degree={data.degree}
            format={data.format}
            financialAid={data.financialAid}
            schoolUrl={data.schoolUrl}
            credentialLevel={data.credentialLevel}
            credentialTitle={data.credentialTitle}
            universityId={data.id}
            universityName={data.name}
            cipCode={data.cipCode}
          />
        </div>
      </div>

      {(activeTab === "Overview" || activeTab === "Programs & Academics") && (
        <ProgramSearchBand
          universityId={data.id}
          universityName={data.name}
          location={data.location}
          schoolType={data.type}
          admissionRate={data.admissionRate}
          tuitionFee={data.tuitionFee}
          avgSalary={data.avgSalary}
          netRoi20Yr={data.netRoi20Yr}
        />
      )}
    </>
  );
}
