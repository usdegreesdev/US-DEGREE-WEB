/**
 * Canonical disclaimer text for each upstream data source, keyed for reuse
 * across the app's "?" info tooltips (see DisclaimerTooltip).
 */
export const DATA_SOURCE_DISCLAIMERS = {
  ipeds:
    "Institutional data is sourced from IPEDS, the U.S. Department of Education's official higher education database.",
  collegeScorecard:
    "Student outcomes, costs, and institutional metrics are sourced from the U.S. Department of Education's College Scorecard.",
  collegeNavigator:
    "College information is sourced from College Navigator, maintained by the National Center for Education Statistics (NCES).",
  censusLehd:
    "Employment and workforce insights are based on data from the U.S. Census Bureau's LEHD -(Post-Secondary Employment Outcomes Explorer) program.",
  eada: "Athletics data is sourced from the U.S. Department of Education's Equity in Athletics Disclosure Act (EADA) database.",
  lehdCalculated:
    "This figure is calculated manually from LEHD data and is not reported directly by the source.",
  compareTuitionInState:
    "Published annual in-state tuition and fees, from U.S. Dept. of Education College Scorecard data. This is the In-state price before any financial aid, grants, scholarships or discounts, and does not include housing, books or other costs.",
  compareTuitionOutOfState:
    "Published annual out-of-state tuition and fees, from U.S. Dept. of Education College Scorecard data. This is the Out-of-state price before any financial aid, grants, scholarships or discounts, and does not include housing, books or other costs.",
  compareAvgSalary:
    "Average earnings of graduates in the program shown, from U.S. Dept. of Education College Scorecard data. Figures are an average of early-career (about 1 and 5 years after graduation) pay for the most recent available graduating class, before inflation adjustment, and some values are estimated. They reflect only graduates who were working, differ by program, and are not a guarantee of your future earnings.",
} as const;
