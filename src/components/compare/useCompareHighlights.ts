import { useMemo } from "react";
import type { College } from "@/types/university/ComparisonTable";

/** Which compared college wins each metric, for highlighting in the table. */
function useHighlights(comparedColleges: College[]) {
  return useMemo(() => {
    const defaultVal = {
      lowestTuitionId: "",
      highestGraduationId: "",
      highestSalaryId: "",
      bestValueId: "",
    };

    if (comparedColleges.length <= 1) return defaultVal;

    const values = {
      lowestTuition: Infinity,
      lowestTuitionId: "",
      highestGraduation: -Infinity,
      highestGraduationId: "",
      highestSalary: -Infinity,
      highestSalaryId: "",
      bestValue: -Infinity,
      bestValueId: "",
    };

    const tuitionValues: number[] = [];
    const graduationValues: number[] = [];
    const salaryValues: number[] = [];
    const valueRatioValues: number[] = [];

    comparedColleges.forEach((c) => {
      const tuition = c.tuitionOutOfState;
      if (tuition !== null) {
        tuitionValues.push(tuition);
        if (tuition < values.lowestTuition) {
          values.lowestTuition = tuition;
          values.lowestTuitionId = c.id;
        }
      }

      if (c.graduationRate !== null) {
        graduationValues.push(c.graduationRate);
        if (c.graduationRate > values.highestGraduation) {
          values.highestGraduation = c.graduationRate;
          values.highestGraduationId = c.id;
        }
      }

      if (c.medianSalary !== null) {
        salaryValues.push(c.medianSalary);
        if (c.medianSalary > values.highestSalary) {
          values.highestSalary = c.medianSalary;
          values.highestSalaryId = c.id;
        }
      }

      // A $0 tuition has no salary-per-dollar ratio; never divide by a stand-in 1.
      if (c.medianSalary !== null && tuition !== null && tuition !== 0) {
        const valueRatio = c.medianSalary / tuition;
        valueRatioValues.push(valueRatio);
        if (valueRatio > values.bestValue) {
          values.bestValue = valueRatio;
          values.bestValueId = c.id;
        }
      }
    });

    const hasTuitionDiff =
      tuitionValues.length > 1 &&
      Math.max(...tuitionValues) !== Math.min(...tuitionValues);
    const hasGradDiff =
      graduationValues.length > 1 &&
      Math.max(...graduationValues) !== Math.min(...graduationValues);
    const hasSalaryDiff =
      salaryValues.length > 1 &&
      Math.max(...salaryValues) !== Math.min(...salaryValues);
    const hasValueRatioDiff =
      valueRatioValues.length > 1 &&
      Math.max(...valueRatioValues) !== Math.min(...valueRatioValues);

    return {
      lowestTuitionId: hasTuitionDiff ? values.lowestTuitionId : "",
      highestGraduationId: hasGradDiff ? values.highestGraduationId : "",
      highestSalaryId: hasSalaryDiff ? values.highestSalaryId : "",
      bestValueId: hasValueRatioDiff ? values.bestValueId : "",
    };
  }, [comparedColleges]);
}

/** Simple averages across compared colleges, for "above/below average" cues. */
function useAverages(comparedColleges: College[]) {
  return useMemo(() => {
    if (comparedColleges.length === 0)
      return { tuition: null, graduationRate: null, medianSalary: null };

    const tuitionColleges = comparedColleges.filter(
      (c) => c.tuitionOutOfState !== null,
    );
    const gradColleges = comparedColleges.filter(
      (c) => c.graduationRate !== null,
    );
    const salaryColleges = comparedColleges.filter(
      (c) => c.medianSalary !== null,
    );

    const sumTuition = tuitionColleges.reduce(
      (s, c) => s + (c.tuitionOutOfState as number),
      0,
    );
    const sumGraduation = gradColleges.reduce(
      (s, c) => s + (c.graduationRate as number),
      0,
    );
    const sumSalary = salaryColleges.reduce(
      (s, c) => s + (c.medianSalary as number),
      0,
    );

    return {
      tuition:
        tuitionColleges.length > 0 ? sumTuition / tuitionColleges.length : null,
      graduationRate:
        gradColleges.length > 0 ? sumGraduation / gradColleges.length : null,
      medianSalary:
        salaryColleges.length > 0 ? sumSalary / salaryColleges.length : null,
    };
  }, [comparedColleges]);
}

export function useCompareHighlights(comparedColleges: College[]) {
  const highlights = useHighlights(comparedColleges);
  const averages = useAverages(comparedColleges);
  return { highlights, averages };
}
