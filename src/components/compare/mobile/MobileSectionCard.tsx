import DisclaimerTooltip from "@/components/common/DisclaimerTooltip";

interface MobileSectionCardProps {
  title: string;
  subtitle: string;
  /** Optional disclaimer shown via a "?" tooltip next to the title. */
  tooltip?: string;
  children: React.ReactNode;
}

/** White rounded card wrapper used by every metric section in the mobile comparison view. */
export default function MobileSectionCard({ title, subtitle, tooltip, children }: MobileSectionCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="mb-3">
        <div className="flex items-center gap-1.5">
          <h4 className="font-extrabold text-slate-800 text-sm">{title}</h4>
          {tooltip && <DisclaimerTooltip text={tooltip} maxWidth={300} />}
        </div>
        <p className="text-[10px] text-gray-400 font-semibold">{subtitle}</p>
      </div>
      <div className="compare-values divide-y divide-gray-100">{children}</div>
    </div>
  );
}
