import { describe, it, expect } from "vitest";
import {
  classifySearchFailure,
  extractSearchRows,
  pickSearchParams,
} from "./searchParams";

describe("pickSearchParams", () => {
  it("keeps allowlisted params and drops the rest", () => {
    const out = pickSearchParams(
      new URLSearchParams(
        "title=a&fields=x&per_page=50&view=grid&school_type=public",
      ),
    );
    expect(out.toString()).toBe("title=a");
  });

  it("only accepts type=programs", () => {
    expect(
      pickSearchParams(new URLSearchParams("type=programs")).get("type"),
    ).toBe("programs");
    expect(
      pickSearchParams(new URLSearchParams("type=universities")).has("type"),
    ).toBe(false);
  });

  it("rejects non-numeric or non-positive page/limit", () => {
    expect(
      pickSearchParams(new URLSearchParams("page=0&limit=abc")).toString(),
    ).toBe("");
  });
});

describe("classifySearchFailure", () => {
  it("maps statuses to UI failures", () => {
    expect(classifySearchFailure(429, 1)).toBe("rate_limited");
    expect(classifySearchFailure(401, 1)).toBe("unauthorized");
    expect(classifySearchFailure(400, 1)).toBe("bad_request");
    expect(classifySearchFailure(400, 26)).toBe("depth_limit");
    expect(classifySearchFailure(500, 1)).toBe("generic");
  });
});

describe("extractSearchRows", () => {
  it("handles arrays, {results}, and junk", () => {
    expect(extractSearchRows([1])).toEqual([1]);
    expect(extractSearchRows({ results: [2] })).toEqual([2]);
    expect(extractSearchRows(null)).toEqual([]);
    expect(extractSearchRows({})).toEqual([]);
  });
});
