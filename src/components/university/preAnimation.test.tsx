import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ComponentProps } from "react";
import AdmissionsOverview from "./AdmissionsOverview";
import OutcomesSection from "./OutcomesSection";
import ProgramsAcademicsTab from "./ProgramsAcademicsTab";

// Item 8: a card that never scrolls into view must show the real figure (or
// Not published), never a "$0" / "0%" placeholder; a missing value is no bar.

beforeEach(() => {
  // Never intersects: the count-up never runs.
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

describe("pre-animation state is the real value", () => {
  it("Admissions outcomes card: real salary / Not published, no $0 or 0%", () => {
    render(
      <AdmissionsOverview
        {...({
          admissionRate: "45.0%",
          applicants: "N/A",
          salaryYear1: 48000,
          salaryYear10: 65000,
          netRoi20Yr: null,
          growthRate: null,
        } as unknown as ComponentProps<typeof AdmissionsOverview>)}
      />,
    );
    expect(screen.getByText(/\$65,000/)).toBeInTheDocument();
    expect(screen.getByText("$48,000")).toBeInTheDocument();
    expect(screen.queryByText("$0")).toBeNull();
    expect(screen.queryByText("0%")).toBeNull();
    expect(screen.getByText("45.0%")).toBeInTheDocument();
  });

  it("Programs tab metrics: real admission rate and enrollment, not 0% / 0", () => {
    render(
      <ProgramsAcademicsTab
        data={{ admissionRate: "45.0%", totalStudents: 1234, tuitionFee: "$21,000" }}
      />,
    );
    expect(screen.getByText("45.0%")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByTestId("tuition-value")).toHaveTextContent("$21,000");
  });
});

describe("a missing value is no bar", () => {
  it("retention null → no bar element", () => {
    const { container } = render(<OutcomesSection retentionPct={null} />);
    expect(container.querySelector(".bg-\\[\\#2563EB\\].h-2")).toBeNull();
  });

  it("retention present → a bar", () => {
    const { container } = render(<OutcomesSection retentionPct={80} />);
    expect(container.querySelector(".bg-\\[\\#2563EB\\].h-2")).not.toBeNull();
  });
});
