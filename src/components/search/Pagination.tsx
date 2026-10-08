import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "@/lib/search/searchRequest";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  /** Sizes offered; defaults to all. Anonymous visitors get fewer. */
  pageSizeOptions?: readonly number[];
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
}: PaginationProps) {
  const pageSizePicker = (
    <label className="flex items-center gap-2 text-xs font-bold text-gray-500">
      Show
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {pageSizeOptions.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      / page
    </label>
  );

  // Still let the user change the page size even when there's only one page
  // of results — a bigger page size might reveal more of them.
  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-center mt-12 mb-8">
        {pageSizePicker}
      </div>
    );
  }

  // Build a smart page list with ellipsis for large page counts. Always
  // surfaces a run of pages at whichever edge(s) are close to the current
  // page (e.g. "1 2 3 4 5 ... 100" on page 1) rather than collapsing
  // everything but the immediate neighbors down to a single leading/trailing
  // page number.
  const getPageNumbers = (): (number | "ellipsis-start" | "ellipsis-end")[] => {
    const siblingCount = 1;
    const totalNumbersShown = siblingCount * 2 + 5; // first + last + current + 2 siblings + 2 edge fillers

    const range = (start: number, end: number) =>
      Array.from({ length: end - start + 1 }, (_, i) => start + i);

    if (totalPages <= totalNumbersShown) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + siblingCount * 2;
      return [...range(1, leftItemCount), "ellipsis-end", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + siblingCount * 2;
      return [
        1,
        "ellipsis-start",
        ...range(totalPages - rightItemCount + 1, totalPages),
      ];
    }

    return [
      1,
      "ellipsis-start",
      ...range(leftSiblingIndex, rightSiblingIndex),
      "ellipsis-end",
      totalPages,
    ];
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 mb-8">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>

        {pageNumbers.map((item, idx) =>
          item === "ellipsis-start" || item === "ellipsis-end" ? (
            <span
              key={`${item}-${idx}`}
              className="w-8 h-8 flex items-center justify-center text-gray-400"
            >
              <MoreHorizontal size={14} />
            </span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition ${
                currentPage === item
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 font-medium"
              }`}
            >
              {item}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-150 rounded-full px-3 py-1 shadow-sm leading-none shrink-0">
        Page {currentPage} of {totalPages}
      </span>

      {pageSizePicker}
    </div>
  );
}
