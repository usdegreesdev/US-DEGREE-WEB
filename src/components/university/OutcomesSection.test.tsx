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
    expect(screen.getByText("Not published")).toBeInTheDocument();
    expect(screen.queryByText(/94%/)).toBeNull();
    expect(screen.queryByText(/employment/i)).toBeNull();
  });

  it("shows Not published when the prop is omitted", () => {
    render(<OutcomesSection />);
    expect(screen.getByText("Not published")).toBeInTheDocument();
  });

  it("renders a real 0 as 0%, not N/A or Not published", async () => {
    render(<OutcomesSection retentionPct={0} />);
    await waitFor(() => expect(screen.getByText("0%")).toBeInTheDocument());
    expect(screen.queryByText("Not published")).toBeNull();
  });

  it("renders the already-scaled retention percent", async () => {
    render(<OutcomesSection retentionPct={82} />);
    await waitFor(() => expect(screen.getByText("82%")).toBeInTheDocument(), {
      timeout: 3000,
    });
  });
});
