import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ProgramsAcademicsTab from "./ProgramsAcademicsTab";
import CampusStudentsTab from "./CampusStudentsTab";
import type { CampusData } from "@/types/university/CampusStudentsTab";

// Item 3: repayment.all_borrowers_3yr is 100 for all 5,761 schools — it was
// shown as "loan repayment 100%" on every school. Suppressed everywhere.

beforeEach(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

// Even a stale API response carrying the field must not display it.
const campusData = {
  repayment: { all_borrowers_3yr: 100, graduates_3yr: 40 },
} as unknown as CampusData;

describe("all_borrowers_3yr is never displayed", () => {
  it("Programs tab has no Loan Repayment card", () => {
    render(<ProgramsAcademicsTab data={{ campusData }} />);
    expect(screen.queryByText(/Loan Repayment/i)).toBeNull();
    expect(screen.queryByText("100%")).toBeNull();
  });

  it("Campus tab has no All Borrowers row", () => {
    render(<CampusStudentsTab campusData={campusData} />);
    expect(screen.queryByText(/All Borrowers/i)).toBeNull();
  });

  it("no web source file reads all_borrowers_3yr", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
          const code = fs
            .readFileSync(p, "utf8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/.*$/gm, "");
          if (/all_borrowers_3yr/.test(code)) offenders.push(p);
        }
      }
    };
    walk(path.resolve(__dirname, "../.."));
    expect(offenders).toEqual([]);
  });
});
