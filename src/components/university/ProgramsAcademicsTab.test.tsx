import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import ProgramsAcademicsTab from "./ProgramsAcademicsTab";
import type { TuitionData } from "@/types/university/TuitionData";

beforeEach(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
});

describe("ProgramsAcademicsTab tuition tile (item 1)", () => {
  it("not-published sticker shows Not published + missing components, never in-state tuition alone", () => {
    render(
      <ProgramsAcademicsTab
        data={{
          tuitionFee: null,
          tuitionFeeMissing: ["on-campus room and board", "books and supplies"],
          // Old code fell back to this figure, shown as if it were the total.
          tuitionData: {
            tuition: { tuition_in_state: 9876 },
          } as unknown as TuitionData,
        }}
      />,
    );
    expect(screen.getByTestId("tuition-value")).toHaveTextContent(
      "Not published",
    );
    expect(screen.getByTestId("tuition-caption")).toHaveTextContent(
      "Missing: on-campus room and board, books and supplies",
    );
    expect(screen.queryByText(/9,876/)).toBeNull();
    expect(screen.queryByText("$0")).toBeNull();
  });
});
