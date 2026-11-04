import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Pagination from "./Pagination";

const baseProps = {
  currentPage: 3,
  totalPages: 20,
  onPageChange: vi.fn(),
  pageSize: 10,
  onPageSizeChange: vi.fn(),
};

describe("Pagination", () => {
  it("wraps its controls so they cannot overflow the viewport", () => {
    const { container } = render(<Pagination {...baseProps} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("md:flex-wrap");
    expect(root.className).toContain("max-w-full");
    expect(root.firstElementChild?.className).toContain("flex-wrap");
  });

  it("uses 44px touch targets on mobile", () => {
    render(<Pagination {...baseProps} />);
    const page = screen.getByRole("button", { name: "3" });
    expect(page.className).toContain("w-11");
    expect(page.className).toContain("h-11");
  });

  it("keeps the page-size picker with a single page", () => {
    render(<Pagination {...baseProps} totalPages={1} />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });
});
