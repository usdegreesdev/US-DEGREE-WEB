import { describe, expect, it } from "vitest";
import {
  inStateOnCampusSticker,
  notPublishedReason,
  stickerDisplay,
  sumStickerComponents,
} from "./stickerPrice";
import { buildUniversityViewData } from "./buildUniversityViewData";
import type { UniversityApiBundle } from "./fetchUniversityData";

// Blast radius (public.costs, 2026-11-18): 3,602 of the 5,530 schools with a
// costs row are missing at least one in-state on-campus component, and 2,251
// are missing all four. The old code filled them with 12714 / 1200 / 7348 /
// 2832, so those 2,251 schools all displayed the same $24,094.
const OLD_CONSTANT_TOTAL = "$24,094";

const FULL = {
  tuition_in_state: 10000,
  roomboard_oncampus: 8000,
  booksupply: 1000,
  otherexpense_oncampus: 2000,
};

describe("sticker price: sum of published components or not published", () => {
  it("all four present → the real total", () => {
    const s = inStateOnCampusSticker(FULL);
    expect(s).toEqual({ published: true, total: 21000, missing: [] });
    expect(stickerDisplay(s)).toBe("$21,000");
  });

  it("all four missing (2,251 schools) → not published, never $24,094", () => {
    const s = inStateOnCampusSticker({});
    expect(s.published).toBe(false);
    expect(s.total).toBeNull();
    expect(s.missing).toEqual([
      "in-state tuition",
      "on-campus room and board",
      "books and supplies",
      "on-campus other expenses",
    ]);
    expect(stickerDisplay(s)).not.toContain(OLD_CONSTANT_TOTAL);
  });

  it("one missing (part of the 3,602) → not published, names it, no partial sum", () => {
    const s = inStateOnCampusSticker({ ...FULL, roomboard_oncampus: null });
    expect(s.total).toBeNull();
    expect(stickerDisplay(s)).toBe(
      "Not published (missing: on-campus room and board)",
    );
    expect(stickerDisplay(s)).not.toMatch(/\$/);
  });

  it("a real $0 component is a value, not missing", () => {
    const s = inStateOnCampusSticker({ ...FULL, booksupply: 0 });
    expect(s).toEqual({ published: true, total: 20000, missing: [] });
  });

  it("numeric strings parse; garbage counts as missing", () => {
    expect(
      sumStickerComponents([
        ["a", "100"],
        ["b", 50],
      ]),
    ).toEqual({ published: true, total: 150, missing: [] });
    expect(sumStickerComponents([["a", "abc"]]).missing).toEqual(["a"]);
  });

  it("reason text", () => {
    expect(notPublishedReason([])).toBe("Not published");
    expect(notPublishedReason(["x", "y"])).toBe(
      "Not published (missing: x, y)",
    );
  });
});

describe("buildUniversityViewData sticker price", () => {
  const bundle = (tuitionData: unknown) =>
    ({ tuitionData }) as unknown as UniversityApiBundle;

  it("missing components → tuitionFee null, components named, no constant", async () => {
    const v = await buildUniversityViewData(
      "1",
      {},
      bundle({ tuition: {}, housing: {}, expenses: {} }),
    );
    expect(v.tuitionFee).toBeNull();
    expect(v.tuitionFeeMissing).toHaveLength(4);
    expect(JSON.stringify(v)).not.toContain(OLD_CONSTANT_TOTAL);
  });

  it("all components → the real total", async () => {
    const v = await buildUniversityViewData(
      "1",
      {},
      bundle({
        tuition: { tuition_in_state: 10000, booksupply: 1000 },
        housing: { roomboard_oncampus: 8000 },
        expenses: { otherexpense_oncampus: 2000 },
      }),
    );
    expect(v.tuitionFee).toBe("$21,000");
    expect(v.tuitionFeeMissing).toEqual([]);
  });

  it("no tuition response and no URL value → null, not N/A", async () => {
    const v = await buildUniversityViewData("1", {}, bundle(null));
    expect(v.tuitionFee).toBeNull();
  });
});
