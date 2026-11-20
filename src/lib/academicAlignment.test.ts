import { describe, expect, it } from "vitest";
import {
  checkAlignment,
  normalizeDegree,
  normalizeField,
  normalizeState,
  profilePrefsFromApi,
  type CompareItem,
  type ProfilePrefs,
} from "./academicAlignment";

const prefs: ProfilePrefs = {
  preferredDegreeLevels: ["bachelor"],
  preferredFieldCipFamilies: ["11"],
  preferredStateCodes: ["TX"],
};
const match: CompareItem = { degreeLevel: "bachelor", cipCode: "11.07", stateCode: "TX" };

describe("normalizers", () => {
  it("degree buckets match the backend (1,4,8 certificate; 7 doctorate)", () => {
    const expected = ["certificate", "associate", "bachelor", "certificate", "master", "doctorate", "doctorate", "certificate"];
    expected.forEach((bucket, i) => {
      expect(normalizeDegree(i + 1)).toBe(bucket);
      expect(normalizeDegree(String(i + 1))).toBe(bucket);
    });
    expect(normalizeDegree(0)).toBeNull();
    expect(normalizeDegree(9)).toBeNull();
  });
  it("degree from bucket names and canonical titles", () => {
    expect(normalizeDegree("bachelor")).toBe("bachelor");
    expect(normalizeDegree("Bachelor’s Degree")).toBe("bachelor");
    expect(normalizeDegree("Post-baccalaureate Certificate")).toBe("certificate");
    expect(normalizeDegree("Graduate/Professional Certificate")).toBe("certificate");
    expect(normalizeDegree("First Professional Degree")).toBe("doctorate");
    expect(normalizeDegree("Undergraduate Certificate or Diploma")).toBe("certificate");
    expect(normalizeDegree("nonsense")).toBeNull();
    expect(normalizeDegree("")).toBeNull();
    expect(normalizeDegree(null)).toBeNull();
  });
  it("field: dotted, undotted and zero-stripped forms", () => {
    expect(normalizeField("11.07")).toBe("11");
    expect(normalizeField("1.0701")).toBe("01");
    expect(normalizeField("01.0701")).toBe("01");
    expect(normalizeField("1002")).toBe("10");
    expect(normalizeField("110701")).toBe("11");
    expect(normalizeField("1")).toBe("01");
    expect(normalizeField("default")).toBeNull();
    expect(normalizeField(undefined)).toBeNull();
  });
  it("state is a 2-letter code only", () => {
    expect(normalizeState("tx")).toBe("TX");
    expect(normalizeState("Texas")).toBeNull();
    expect(normalizeState("state")).toBeNull();
    expect(normalizeState("")).toBeNull();
  });
});

describe("profilePrefsFromApi", () => {
  it("reads camelCase or snake_case backend fields", () => {
    expect(
      profilePrefsFromApi({
        preferredDegreeLevels: ["bachelor"],
        preferred_field_cip_families: ["11"],
        preferredStateCodes: ["TX"],
      }),
    ).toEqual(prefs);
  });
  it("is null-safe", () => {
    const p = profilePrefsFromApi({});
    expect(p.preferredDegreeLevels).toBeNull();
    expect(checkAlignment(p, [match]).aligned).toBe(true);
    expect(profilePrefsFromApi({ preferredStateCodes: "TX" }).preferredStateCodes).toBeNull();
  });
});

describe("checkAlignment", () => {
  it("all match", () => {
    const r = checkAlignment(prefs, [match]);
    expect(r.aligned).toBe(true);
    expect(r.differingFields).toEqual([]);
  });
  it("one differs", () => {
    const r = checkAlignment(prefs, [{ ...match, stateCode: "AL" }]);
    expect(r.aligned).toBe(false);
    expect(r.differingFields).toEqual(["state"]);
    expect(r.current.states).toEqual(["AL"]);
    expect(r.current.degrees).toEqual([]);
  });
  it("several differ (profile Bachelor/CS/TX vs Doctorate/Agriculture/AL)", () => {
    const r = checkAlignment(prefs, [
      { degreeLevel: "doctorate", cipCode: "01.01", stateCode: "AL" },
    ]);
    expect(r.differingFields).toEqual(["degree", "field", "state"]);
    expect(r.current).toEqual({ degrees: ["doctorate"], fields: ["01"], states: ["AL"] });
    expect(r.saved).toEqual({ degrees: ["bachelor"], fields: ["11"], states: ["TX"] });
  });
  it("empty profile is aligned", () => {
    const item = { degreeLevel: "doctorate", cipCode: "01.01", stateCode: "AL" };
    expect(checkAlignment({}, [item]).aligned).toBe(true);
    expect(
      checkAlignment(
        { preferredDegreeLevels: [], preferredFieldCipFamilies: [], preferredStateCodes: [] },
        [item],
      ).aligned,
    ).toBe(true);
  });
  it("partial profile only checks configured fields", () => {
    const p: ProfilePrefs = { preferredStateCodes: ["TX"] };
    const other = { degreeLevel: "master", cipCode: "01.01" };
    expect(checkAlignment(p, [{ ...other, stateCode: "TX" }]).aligned).toBe(true);
    expect(checkAlignment(p, [{ ...other, stateCode: "AL" }]).differingFields).toEqual(["state"]);
  });
  it("null compare data is skipped, not a mismatch", () => {
    expect(checkAlignment(prefs, [{ degreeLevel: null, cipCode: null, stateCode: null }]).aligned).toBe(true);
    expect(checkAlignment(prefs, [{}]).aligned).toBe(true);
    expect(checkAlignment(prefs, []).aligned).toBe(true);
    expect(checkAlignment(prefs, [{ ...match, degreeLevel: null }]).aligned).toBe(true);
  });
  it("several colleges, one differing -> one consolidated result", () => {
    const r = checkAlignment(prefs, [
      match,
      { ...match, stateCode: "AL" },
      { ...match, stateCode: "AL" },
    ]);
    expect(r.differingFields).toEqual(["state"]);
    expect(r.current.states).toEqual(["AL"]);
  });
  it("multi-value sets", () => {
    const p: ProfilePrefs = {
      preferredDegreeLevels: ["bachelor", "master"],
      preferredFieldCipFamilies: ["11", "14"],
      preferredStateCodes: ["TX", "CA"],
    };
    expect(
      checkAlignment(p, [
        { degreeLevel: "master", cipCode: "14.09", stateCode: "CA" },
        { degreeLevel: "bachelor", cipCode: "11.07", stateCode: "TX" },
      ]).aligned,
    ).toBe(true);
    const r = checkAlignment(p, [
      { degreeLevel: "master", cipCode: "14.09", stateCode: "CA" },
      { degreeLevel: "doctorate", cipCode: "11.07", stateCode: "NY" },
    ]);
    expect(r.differingFields).toEqual(["degree", "state"]);
    expect(r.current.degrees).toEqual(["doctorate"]);
    expect(r.current.states).toEqual(["NY"]);
  });
  it("a certificate-bucket level (4 or 8) is compared, not skipped", () => {
    const p: ProfilePrefs = { preferredDegreeLevels: ["bachelor"] };
    expect(checkAlignment(p, [{ degreeLevel: "Post-baccalaureate Certificate" }]).differingFields).toEqual(["degree"]);
    expect(checkAlignment(p, [{ degreeLevel: 7 }]).current.degrees).toEqual(["doctorate"]);
  });
});
