import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
// @ant-design/icons pulls a second copy of React under vitest; these are
// decorative here, so stub them.
vi.mock("@ant-design/icons", () => ({ QuestionCircleOutlined: () => null }));
vi.mock("@/components/common/DisclaimerTooltip", () => ({ default: () => null }));

import TuitionCostsSection from "./TuitionCostsSection";
import type { TuitionData } from "@/types/university/TuitionData";

// The count-up animation observes scroll position; jsdom has no observer.
beforeAll(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

const FULL: TuitionData = {
  tuition: { tuition_in_state: 10000, booksupply: 1000 },
  housing: { roomboard_oncampus: 12000 },
  expenses: { otherexpense_oncampus: 2000 },
  net_price: { income_0_30000: 8000 },
};

describe("calculator unavailable-values note", () => {
  it("is shown, naming both values, when sticker price and aid are missing", () => {
    render(<TuitionCostsSection tuitionData={{}} />);
    const note = screen.getByTestId("calculator-unavailable-note");
    expect(note).toHaveTextContent(/sticker price and estimated financial aid/);
    expect(note).toHaveTextContent(/not available or published at the source/);
    expect(note).toHaveTextContent(/hence they show as "Not published"/);
    expect(note).toHaveTextContent(/admissions office or official website/);
  });

  it("names only the aid when the sticker price is published but the net price is not", () => {
    render(
      <TuitionCostsSection tuitionData={{ ...FULL, net_price: {} }} />,
    );
    const note = screen.getByTestId("calculator-unavailable-note");
    expect(note).toHaveTextContent(/estimated financial aid value is not available/);
    expect(note).not.toHaveTextContent(/sticker price/);
  });

  it("is absent when both are available", () => {
    render(<TuitionCostsSection tuitionData={FULL} />);
    expect(screen.queryByTestId("calculator-unavailable-note")).not.toBeInTheDocument();
  });
});
