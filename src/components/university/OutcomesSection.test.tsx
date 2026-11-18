import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import OutcomesSection from "./OutcomesSection";

beforeEach(() => {
  // Fire "intersecting" immediately so the count-up runs to completion.
  window.IntersectionObserver = class {
    constructor(cb: IntersectionObserverCallback) {
      setTimeout(
        () =>
          cb(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
        0,
      );
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

describe("OutcomesSection retention tile", () => {
  it("shows Not published when retention is null, never a constant", () => {
    render(<OutcomesSection retentionPct={null} />);
    expect(screen.getByText("FIRST-YEAR RETENTION")).toBeInTheDocument();
    expect(screen.getByTestId("retention-value")).toHaveTextContent(
      "Not published",
    );
    expect(screen.queryByText(/94%/)).toBeNull();
    expect(screen.queryByText(/employment/i)).toBeNull();
  });

  it("shows Not published when the prop is omitted", () => {
    render(<OutcomesSection />);
    expect(screen.getByTestId("retention-value")).toHaveTextContent(
      "Not published",
    );
  });

  it("renders a real 0 as 0%, not N/A or Not published", async () => {
    render(<OutcomesSection retentionPct={0} />);
    await waitFor(() =>
      expect(screen.getByTestId("retention-value")).toHaveTextContent("0%"),
    );
    expect(screen.getByTestId("retention-value")).not.toHaveTextContent(
      "Not published",
    );
  });

  it("renders the already-scaled retention percent", async () => {
    render(<OutcomesSection retentionPct={82} />);
    await waitFor(
      () =>
        expect(screen.getByTestId("retention-value")).toHaveTextContent("82%"),
      { timeout: 3000 },
    );
  });
});

describe("OutcomesSection salary trajectory (item 2)", () => {
  it("plots only the published points, no YEAR 15/20, names the gap", async () => {
    render(
      <OutcomesSection salaryYear1={null} salaryYear5={52000} salaryYear10={65000} />,
    );
    const chart = screen.getByTestId("salary-trajectory");
    expect(chart).toHaveTextContent("YEAR 5");
    expect(chart).not.toHaveTextContent("YEAR 15");
    expect(chart).not.toHaveTextContent("YEAR 20");
    expect(chart).not.toHaveTextContent("ENTRY");
    expect(screen.getAllByTestId("trajectory-point")).toHaveLength(2);
    expect(screen.getByTestId("trajectory-gap-note")).toHaveTextContent(
      "Year 1 earnings are not published",
    );
    expect(screen.queryByText(/Projected/i)).toBeNull();
  });

  it("no earnings → empty state, no chart", () => {
    render(<OutcomesSection />);
    expect(screen.queryByTestId("salary-trajectory")).toBeNull();
    expect(
      screen.getByText(/Salary trajectory data is not available/),
    ).toBeInTheDocument();
  });
});

describe("OutcomesSection debt-to-income (report basis, item 10)", () => {
  // The old fallback: ratio 0.4 → "1:2.5", "~2.5x", debt = earnings × 0.4.
  const expectNoInventedRatio = () => {
    expect(screen.queryByText(/2\.5/)).toBeNull();
    expect(screen.queryByText(/HIGH ROI POTENTIAL|GOOD VALUE/)).toBeNull();
    expect(screen.queryByTestId("debt-ratio-bar")).toBeNull();
    expect(screen.queryByText(/their debt after/)).toBeNull();
  };

  it("null ratio renders Not published, not 0.4 / 2.5x", () => {
    render(<OutcomesSection debtIncomeRatio={null} debtRatioEarnings={50000} />);
    expect(screen.getByTestId("debt-ratio-value")).toHaveTextContent(
      "Not published",
    );
    expectNoInventedRatio();
  });

  it("omitted ratio renders Not published", () => {
    render(<OutcomesSection />);
    expect(screen.getByTestId("debt-ratio-value")).toHaveTextContent(
      "Not published",
    );
    expectNoInventedRatio();
  });

  it("a 0 ratio is no ratio, as in the PDF report", () => {
    render(<OutcomesSection debtIncomeRatio={0} />);
    expect(screen.getByTestId("debt-ratio-value")).toHaveTextContent(
      "Not published",
    );
    expectNoInventedRatio();
  });

  it("missing typical debt is Not published, never earnings × ratio", () => {
    render(<OutcomesSection debtRatioDebt={null} debtRatioEarnings={50000} />);
    expect(screen.getByTestId("avg-debt-value")).toHaveTextContent(
      "Not published",
    );
    expect(screen.queryByText("$20,000")).toBeNull();
  });

  it("real $0 inputs render $0", async () => {
    render(<OutcomesSection debtRatioDebt={0} debtRatioEarnings={0} />);
    await waitFor(() => {
      expect(screen.getByTestId("avg-debt-value")).toHaveTextContent("$0");
      expect(screen.getByTestId("early-earnings-value")).toHaveTextContent(
        "$0",
      );
    });
  });

  it("renders the report's figure, its own school-level inputs and its definition", async () => {
    // 12,000 ÷ 48,000 = 0.25 debt per $1 of earnings — the PDF's "0.25 : 1".
    render(
      <OutcomesSection
        debtIncomeRatio={0.25}
        debtRatioDebt={12000}
        debtRatioEarnings={48000}
        debtRatioBasisLabel="6 years after first enrolling"
        debtRatioDefinition="The school's typical debt ÷ the school's median earnings 6 years after students first enrolled."
      />,
    );
    await waitFor(
      () => {
        expect(screen.getByTestId("debt-ratio-value")).toHaveTextContent(
          "0.25 : 1 debt per $1 of earnings",
        );
        expect(screen.getByTestId("avg-debt-value")).toHaveTextContent(
          "$12,000",
        );
        expect(screen.getByTestId("early-earnings-value")).toHaveTextContent(
          "$48,000",
        );
      },
      { timeout: 3000 },
    );
    expect(
      screen.getByText("School median earnings, 6 years after first enrolling"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("debt-ratio-definition")).toHaveTextContent(
      "typical debt ÷ the school's median earnings",
    );
    expect(screen.getByTestId("debt-ratio-bar")).toBeInTheDocument();
    expect(screen.queryByText(/their debt after/)).toBeNull();
  });

  it.each([0.25, 0.62])(
    "never labels a real ratio (%s) good or bad",
    async (ratio) => {
      render(<OutcomesSection debtIncomeRatio={ratio} />);
      await waitFor(() =>
        expect(screen.getByTestId("debt-ratio-bar")).toBeInTheDocument(),
      );
      expect(
        screen.queryByText(/HIGH ROI POTENTIAL|GOOD VALUE|good|risky/i),
      ).toBeNull();
    },
  );

  it("a string ratio from the API is parsed, not defaulted", async () => {
    render(<OutcomesSection debtIncomeRatio="0.5" />);
    await waitFor(() =>
      expect(screen.getByTestId("debt-ratio-value")).toHaveTextContent(
        "0.50 : 1",
      ),
    );
  });
});
