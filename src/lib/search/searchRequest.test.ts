import { describe, it, expect } from "vitest";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { buildSearchRequest } from "./searchRequest";
import { CATEGORY_KEYWORDS } from "@/constants/searchCategories";

/** URLSearchParams is structurally compatible with the readonly Next type. */
function sp(init: string): ReadonlyURLSearchParams {
  return new URLSearchParams(init) as unknown as ReadonlyURLSearchParams;
}

describe("buildSearchRequest", () => {
  it("passes through unrelated params untouched", () => {
    const { requestParams } = buildSearchRequest(sp("title=nursing&page=2"), "");
    expect(requestParams.get("title")).toBe("nursing");
    expect(requestParams.get("page")).toBe("2");
  });

  // school_type and category are applied client-side by filterSearchResults;
  // sending them upstream would narrow the set the client still needs.
  it("strips the client-side-only params", () => {
    const { requestParams } = buildSearchRequest(
      sp("school_type=public&category=business&title=x"),
      "business",
    );
    expect(requestParams.has("school_type")).toBe(false);
    expect(requestParams.has("category")).toBe(false);
  });

  it("substitutes the primary category keyword as the title when none is set", () => {
    const { requestParams } = buildSearchRequest(sp("category=business"), "business");
    expect(requestParams.get("title")).toBe(CATEGORY_KEYWORDS.business[0]);
  });

  it("does not overwrite an explicit title with the category keyword", () => {
    const { requestParams } = buildSearchRequest(
      sp("category=business&title=accounting"),
      "business",
    );
    expect(requestParams.get("title")).toBe("accounting");
  });

  it("leaves the title unset for an unknown category", () => {
    const { requestParams } = buildSearchRequest(sp(""), "not-a-real-category");
    expect(requestParams.has("title")).toBe(false);
  });

  describe("multi-value selections", () => {
    // The API narrows and paginates multi-value selections itself, so they are
    // sent as comma-separated lists rather than filtered client-side.
    it("sends credentials and states as comma-separated lists", () => {
      const { requestParams } = buildSearchRequest(
        sp("credential_title=A,B&state=CA,NY,TX"),
        "",
      );
      expect(requestParams.get("credential_title")).toBe("A,B");
      expect(requestParams.get("state")).toBe("CA,NY,TX");
    });

    it("ignores empty segments from trailing commas", () => {
      const { requestParams } = buildSearchRequest(sp("state=CA,,NY,"), "");
      expect(requestParams.get("state")).toBe("CA,NY");
    });

    it("caps each list at the backend's 10 values", () => {
      const states = Array.from({ length: 12 }, (_, i) => `S${i}`).join(",");
      const { requestParams } = buildSearchRequest(sp(`state=${states}`), "");
      expect(requestParams.get("state")?.split(",")).toHaveLength(10);
    });

    it("omits the params when nothing is selected", () => {
      const { requestParams } = buildSearchRequest(sp(""), "");
      expect(requestParams.has("state")).toBe(false);
      expect(requestParams.has("credential_title")).toBe(false);
    });
  });

  it("drops UI-only params such as per_page and view", () => {
    const { requestParams } = buildSearchRequest(
      sp("per_page=50&view=grid&title=x"),
      "",
    );
    expect(requestParams.toString()).toBe("title=x");
  });

  it("does not mutate the caller's search params", () => {
    const original = sp("school_type=public&title=x");
    buildSearchRequest(original, "");
    expect(original.get("school_type")).toBe("public");
  });
});
