import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  NOT_PUBLISHED,
  formatPercentOrNotPublished,
  retentionToPercent,
} from "./outcomeFormat";
import { mapToCardProps } from "@/lib/search/mapToCardProps";
import type { SearchResult } from "@/types/search-details";

describe("retentionToPercent", () => {
  it("multiplies the 0–1 fraction by 100", () => {
    expect(retentionToPercent(0.82)).toBeCloseTo(82);
    expect(retentionToPercent("0.5")).toBeCloseTo(50);
    expect(retentionToPercent(1)).toBe(100);
  });
  it("keeps a real 0 as 0 and null as null (no default)", () => {
    expect(retentionToPercent(0)).toBe(0);
    expect(retentionToPercent(null)).toBeNull();
    expect(retentionToPercent(undefined)).toBeNull();
    expect(retentionToPercent("")).toBeNull();
  });
});

describe("formatPercentOrNotPublished", () => {
  it("renders null as Not published, never a constant", () => {
    expect(formatPercentOrNotPublished(null)).toBe(NOT_PUBLISHED);
    expect(formatPercentOrNotPublished(undefined)).toBe(NOT_PUBLISHED);
    expect(formatPercentOrNotPublished(NaN)).toBe(NOT_PUBLISHED);
  });
  it("renders a real 0 as 0%, not N/A", () => {
    expect(formatPercentOrNotPublished(0)).toBe("0%");
    expect(formatPercentOrNotPublished(0, 1)).toBe("0.0%");
  });
  it("does not rescale small percents", () => {
    expect(formatPercentOrNotPublished(1.5, 1)).toBe("1.5%");
  });
});

describe("search card props", () => {
  it("never exposes emp_factor as a card value", () => {
    const props = mapToCardProps({
      program_id: 1,
      program_title: "x",
      cip_code: "11.0701",
      credential_title: "x",
      credential_level: 5,
      school_type: null,
      school_name: "S",
      city: null,
      state: null,
      unitid: 1,
      admission_rate: null,
      earnings_year_5: null,
      roi_20yr: null,
      // still served by the API during the deprecation window
      emp_factor: 42,
    } as unknown as SearchResult);
    expect(props).not.toHaveProperty("gradRate");
    expect(JSON.stringify(props)).not.toContain("42");
  });
});

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

describe("emp_factor is retired from the UI", () => {
  const files = walk(join(process.cwd(), "src"));
  it("no source file reads emp_factor/empFactor/gradRate", () => {
    const offenders = files.filter((f) =>
      /emp_factor|empFactor|\bgradRate\b/.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
  it("no user-facing string calls a value employment", () => {
    const offenders = files.filter(
      (f) =>
        !f.endsWith("dataSourceDisclaimers.ts") &&
        /Employment Rate|EMPLOYMENT RATE|>\s*Employment\s*</.test(
          readFileSync(f, "utf8"),
        ),
    );
    expect(offenders).toEqual([]);
  });
  it("retention is always scaled via retentionToPercent", () => {
    for (const f of [
      "src/lib/university/buildUniversityViewData.ts",
      "src/components/userprofile/matchEngine.ts",
    ]) {
      expect(readFileSync(join(process.cwd(), f), "utf8")).toContain(
        "retentionToPercent(",
      );
    }
  });
});
