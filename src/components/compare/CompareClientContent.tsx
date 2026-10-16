"use client";

import CompareHeader from "@/components/compare/CompareHeader";
import ComparisonTable from "@/components/compare/ComparisonTable";
import CollegeDetailsModal from "@/components/compare/CollegeDetailsModal";
import { useCompareColleges } from "@/components/compare/useCompareColleges";
import CompareSearchBar from "@/components/compare/CompareSearchBar";
import EmptyComparisonState from "@/components/compare/EmptyComparisonState";
import { Modal, Spin } from "antd";
import { ServerCompareBundle } from "@/lib/compare/compareServer";

interface CompareClientContentProps {
  initialBundle?: ServerCompareBundle;
}

export default function CompareClientContent({
  initialBundle,
}: CompareClientContentProps) {
  const {
    comparedIds,
    comparedColleges,
    isDetailsLoading,
    isLimitModalOpen,
    isClearingAll,
    removingIds,
    setIsLimitModalOpen,
    activeModalId,
    setActiveModalId,
    collegeDetailsCache,
    setCollegeDetailsCache,
    averages,
    highlights,
    handleAddCollege,
    handleRemoveCollege,
    handleClearAll,
  } = useCompareColleges(initialBundle);

  return (
    <div className="bg-white min-h-screen pt-28 pb-6 lg:pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 1. Header */}
        <CompareHeader
          comparedIds={comparedIds}
          comparedColleges={comparedColleges}
        />

        {/* 2. Selection search bar */}
        <CompareSearchBar
          comparedCount={comparedColleges.length}
          comparedIds={comparedIds}
          onAdd={handleAddCollege}
          onClearAll={handleClearAll}
          isClearingAll={isClearingAll}
        />

        {/* 3. Main canvas (Loading spinner, Comparison table, or Empty state) */}
        {isDetailsLoading ? (
          <div className="flex justify-center items-center py-24 bg-white rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <Spin size="large" />
              <p className="text-gray-400 font-semibold text-sm">
                Retrieving institutional datasets...
              </p>
            </div>
          </div>
        ) : comparedColleges.length === 0 ? (
          <EmptyComparisonState />
        ) : (
          <ComparisonTable
            comparedColleges={comparedColleges}
            averages={averages}
            highlights={highlights}
            onRemove={handleRemoveCollege}
            removingIds={removingIds}
            onViewDetails={(id) => setActiveModalId(id)}
          />
        )}

        <CollegeDetailsModal
          collegeId={activeModalId}
          isOpen={activeModalId !== null}
          onClose={() => setActiveModalId(null)}
          cache={collegeDetailsCache}
          setCache={setCollegeDetailsCache}
          comparedColleges={comparedColleges}
        />

        {/* 5. Limit reached warnings modal */}
        <Modal
          title="Comparison Limit Reached"
          open={isLimitModalOpen}
          onCancel={() => setIsLimitModalOpen(false)}
          onOk={() => setIsLimitModalOpen(false)}
          okText="Got it"
          cancelButtonProps={{ style: { display: "none" } }}
          centered
          className="font-sans"
        >
          <p className="text-gray-600">
            You can compare a maximum of 5 entries simultaneously (the same
            college can be added more than once for different programs) to
            ensure complete readability.
          </p>
        </Modal>
      </div>
    </div>
  );
}
