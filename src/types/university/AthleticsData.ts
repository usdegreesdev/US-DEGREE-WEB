export interface AthleticsRosterRow {
  sport: string;
  /** null when the team's roster size is not reported. */
  men: number | null;
  women: number | null;
}

export interface AthleticsSummary {
  athletesTotal: number | null;
  athletesMen: number | null;
  athletesWomen: number | null;
  athleticAidTotal: number | null;
  avgAidPerAthlete: number | null;
  recruitingExpense: number | null;
  recruitingExpensePerAthlete: number | null;
  athleticRevenue: number | null;
  athleticExpense: number | null;
  surplus: number | null;
}

export interface AthleticsDivisionBenchmark {
  division: string | null;
  avgAidPerAthlete: number | null;
  avgAthletesTotal: number | null;
  avgRecruitingExpense: number | null;
}

export interface AthleticsData {
  unitid: number | string;
  institutionName: string | null;
  division: string | null;
  surveyYear: string | null;
  summary: AthleticsSummary | null;
  sportsOffered: number | null;
  roster: AthleticsRosterRow[];
  summaryParagraph: string | null;
  hasRosterData: boolean;
  divisionBenchmark: AthleticsDivisionBenchmark | null;
}
