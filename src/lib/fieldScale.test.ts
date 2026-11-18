import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FIELD_SCALES, formatPercent, toPercent } from "./fieldScale";
import { deriveCampusDemographics } from "./university/campusDemographics";
import type { CampusData } from "@/types/university/CampusStudentsTab";

describe("field scale registry", () => {
  it("1.5 on a percent field and 0.015 on a fraction field both render 1.5%", () => {
    expect(formatPercent("completion.grad_rate_150nt_pct", 1.5, 1)).toBe("1.5%");
    expect(formatPercent("students.retention_rate", 0.015, 1)).toBe("1.5%");
  });

  it("negative growth_rate renders negative and unscaled: −30 → -30% (49 programs)", () => {
    expect(formatPercent("earnings.growth_rate", -30)).toBe("-30%");
    // The old `n < 2 ? n * 100` turned this into -3000%.
    expect(formatPercent("earnings.growth_rate", -30)).not.toBe("-3000%");
    // 62 programs / 55 schools had |growth| < 2 and were ×100'd.
    expect(formatPercent("earnings.growth_rate", 1.5, 1)).toBe("1.5%");
  });

  it("a percent field below 2 is not inflated (5 schools: graduates_3yr = 1)", () => {
    expect(formatPercent("repayment.graduates_3yr", 1)).toBe("1%");
  });

  it("null renders Not published; a real 0 renders 0%", () => {
    for (const f of Object.keys(FIELD_SCALES) as (keyof typeof FIELD_SCALES)[]) {
      expect(formatPercent(f, null)).toBe("Not published");
    }
    expect(formatPercent("admissions.admission_rate", 0)).toBe("0%");
    expect(formatPercent("completion.grad_rate_150nt_pct", 0)).toBe("0%");
  });

  it("deprecated fields never render a value", () => {
    expect(toPercent("completion.completion_rate", 64.5)).toBeNull();
    expect(formatPercent("students.graduation_rate", 0.85)).toBe("Not published");
  });

  it("campus demographics: API percent kept, faculty fraction ×100 — even at 1.0 / 100", () => {
    const d = deriveCampusDemographics({
      students: {
        demographics: { men: 100, women: 0 },
        faculty: { men: 1, women: 0 },
      },
    } as unknown as CampusData);
    expect(d).toEqual({
      menStudentsPct: 100,
      womenStudentsPct: 0,
      menFacultyPct: 100,
      womenFacultyPct: 0,
    });
  });
});

// Scan: no magnitude-based scale branch anywhere in the web source.
const MAGNITUDE_BRANCH = /[<>]=?\s*(?:1|2|1\.0|100)\s*\?[^;\n]*[*/]\s*100\b/;

describe("scan", () => {
  it("the pattern catches the removed shapes", () => {
    for (const s of [
      "return num < 2 ? Math.round(num * 100) : Math.round(num);",
      "const pct = n <= 1 ? n * 100 : n;",
      "const pct = n < 2 ? n * 100 : n;",
    ]) expect(MAGNITUDE_BRANCH.test(s)).toBe(true);
  });

  it("no magnitude-based scale branch in any web source file", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
          fs.readFileSync(p, "utf8")
            // comments may describe the removed pattern; keep line numbers
            .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ""))
            .replace(/\/\/.*$/gm, "")
            .split("\n")
            .forEach((line, i) => {
              if (MAGNITUDE_BRANCH.test(line))
                offenders.push(`${path.relative(dir, p)}:${i + 1}: ${line.trim()}`);
            });
        }
      }
    };
    walk(path.resolve(__dirname, ".."));
    expect(offenders).toEqual([]);
  });
});
