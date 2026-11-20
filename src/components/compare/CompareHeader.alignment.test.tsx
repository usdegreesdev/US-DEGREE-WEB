import type React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { College } from "@/types/university/ComparisonTable";

// End-to-end check of the Generate Report flow with the alignment check:
// click Generate AI Report -> confirm modal -> Generate -> (modal | report).

const fetchProfile = vi.fn();
const authedFetch = vi.fn();

vi.mock("@/lib/auth/api", () => ({
  fetchProfile: (...a: unknown[]) => fetchProfile(...a),
  authedFetch: (...a: unknown[]) => authedFetch(...a),
}));
// antd animates modals open/closed and never finishes in jsdom, so render
// Modal as plain open/closed: what is in the DOM is exactly what is open.
vi.mock("antd", async (importOriginal) => {
  const actual = await importOriginal<typeof import("antd")>();
  return {
    ...actual,
    Modal: ({ open, children }: { open?: boolean; children?: React.ReactNode }) =>
      open ? <div data-testid="modal">{children}</div> : null,
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));
vi.mock("@/lib/profileCompletion", () => ({ calculateProfileCompletion: () => 100 }));
vi.mock("@/lib/referenceData", () => ({
  fetchStates: async () => [
    { code: "TX", name: "Texas" },
    { code: "AL", name: "Alabama" },
  ],
}));
vi.mock("@/components/userprofile/ProfileDashboard", () => ({
  emptyProfile: () => ({}),
  mergeProfile: (_: unknown, data: Record<string, unknown>) => ({
    preferredPrograms: (data.preferred_programs as string[]) ?? [],
  }),
}));

import CompareHeader from "./CompareHeader";

const SAVED_PROFILE = {
  preferred_programs: ["Computer Science"],
  preferredDegreeLevels: ["bachelor"],
  preferredFieldCipFamilies: ["11"],
  preferredStateCodes: ["TX"],
};

const college = (over: Partial<College> = {}): College =>
  ({
    id: "100654~0101~6",
    unitid: "100654",
    name: "Test University",
    shortName: "Test",
    location: "Montgomery, AL",
    cipCode: "0101",
    programName: "Agriculture",
    degreeLevel: "doctorate",
    programCipCode: "01.01",
    stateCode: "AL",
    ...over,
  }) as College;

/** First fetchProfile call = completion gate (always fine); second = alignment check. */
function setProfile(second: Record<string, unknown> | Error) {
  let n = 0;
  fetchProfile.mockImplementation(async () => {
    n += 1;
    if (n === 1) return SAVED_PROFILE;
    if (second instanceof Error) throw second;
    return second;
  });
}

async function clickThroughToGenerate(colleges: College[]) {
  const user = userEvent.setup();
  render(
    <CompareHeader
      comparedIds={colleges.map((c) => c.id)}
      comparedColleges={colleges}
    />,
  );
  await user.click(screen.getByRole("button", { name: /Generate AI Report/i }));
  await screen.findByText("Generate AI Decision Report");
  await user.click(screen.getByRole("button", { name: /^Generate$/ }));
  return user;
}

const ALIGNMENT_TITLE = "Your comparison is different from your profile";

beforeEach(() => {
  fetchProfile.mockReset();
  authedFetch.mockReset();
  authedFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ reportId: "r1", pdfUrl: "" }),
  });
});

describe("Generate Report with the alignment check", () => {
  it("Bachelor's/CS/Texas profile vs Doctorate/Agriculture/Alabama -> one modal with the differing values", async () => {
    setProfile(SAVED_PROFILE);
    await clickThroughToGenerate([college()]);

    expect(await screen.findByText(ALIGNMENT_TITLE)).toBeInTheDocument();
    expect(screen.getByText("Bachelor's in Computer Science / Texas, USA")).toBeInTheDocument();
    expect(screen.getByText("Doctorate in Agriculture / Alabama, USA")).toBeInTheDocument();
    // Never stacked: the confirm modal is gone and exactly one modal is open.
    expect(screen.queryByText("Generate AI Decision Report")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("modal")).toHaveLength(1);
    expect(authedFetch).not.toHaveBeenCalled();
  });

  it("Continue starts the report with the current comparison; payload unchanged", async () => {
    setProfile(SAVED_PROFILE);
    const user = await clickThroughToGenerate([college()]);
    await user.click(await screen.findByRole("button", { name: /Continue with comparison/i }));

    await waitFor(() => expect(authedFetch).toHaveBeenCalledTimes(1));
    const [path, init] = authedFetch.mock.calls[0];
    expect(path).toBe("/report/generate");
    expect(JSON.parse((init as { body: string }).body)).toEqual({
      selectedColleges: [{ unitid: 100654, cipCode: "0101", programName: "Agriculture" }],
      programId: 20015,
    });
  });

  it("Go back closes the modal only; nothing is generated", async () => {
    setProfile(SAVED_PROFILE);
    const user = await clickThroughToGenerate([college()]);
    await user.click(await screen.findByRole("button", { name: /Go back/i }));

    await waitFor(() => expect(screen.queryByText(ALIGNMENT_TITLE)).not.toBeInTheDocument());
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
    expect(authedFetch).not.toHaveBeenCalled();
  });

  it("matching selection -> no modal, report starts as before", async () => {
    setProfile(SAVED_PROFILE);
    await clickThroughToGenerate([
      college({ degreeLevel: "bachelor", programCipCode: "11.07", stateCode: "TX" }),
    ]);
    await waitFor(() => expect(authedFetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(ALIGNMENT_TITLE)).not.toBeInTheDocument();
  });

  it("no saved prefs -> no modal", async () => {
    setProfile({ preferredDegreeLevels: [], preferredFieldCipFamilies: [], preferredStateCodes: [] });
    await clickThroughToGenerate([college()]);
    await waitFor(() => expect(authedFetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(ALIGNMENT_TITLE)).not.toBeInTheDocument();
  });

  it("null compare values -> no modal", async () => {
    setProfile(SAVED_PROFILE);
    await clickThroughToGenerate([
      college({ degreeLevel: undefined, programCipCode: undefined, stateCode: undefined }),
    ]);
    await waitFor(() => expect(authedFetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(ALIGNMENT_TITLE)).not.toBeInTheDocument();
  });

  it("several colleges, one differing -> one consolidated modal", async () => {
    setProfile(SAVED_PROFILE);
    await clickThroughToGenerate([
      college({ id: "1", unitid: "1", degreeLevel: "bachelor", programCipCode: "11.07", stateCode: "TX" }),
      college({ id: "2", unitid: "2" }),
      college({ id: "3", unitid: "3", degreeLevel: "bachelor", programCipCode: "11.07", stateCode: "TX" }),
    ]);
    expect(await screen.findByText(ALIGNMENT_TITLE)).toBeInTheDocument();
    expect(screen.getAllByTestId("modal")).toHaveLength(1);
    expect(authedFetch).not.toHaveBeenCalled();
  });

  it("profile fetch fails -> report generates directly", async () => {
    setProfile(new Error("network down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await clickThroughToGenerate([college()]);
    await waitFor(() => expect(authedFetch).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(ALIGNMENT_TITLE)).not.toBeInTheDocument();
  });
});
