import DisclaimerTooltip from "@/components/common/DisclaimerTooltip";

interface DesktopRowLabelProps {
  title: string;
  subtitle: string;
  /** Optional disclaimer shown via a "?" tooltip next to the title. */
  tooltip?: string;
}

/** The sticky left-hand cell of a table row, showing the metric's name and a short description. */
export default function DesktopRowLabel({ title, subtitle, tooltip }: DesktopRowLabelProps) {
  return (
    <td className="p-4 md:p-8 sticky left-0 bg-white font-black text-slate-700 z-10 border-r border-gray-100">
      <div>
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-slate-800 text-xs md:text-sm">{title}</p>
          {tooltip && <DisclaimerTooltip text={tooltip} maxWidth={300} />}
        </div>
        <p className="text-[8px] md:text-[10px] font-semibold text-gray-400 mt-0.5">
          {subtitle}
        </p>
      </div>
    </td>
  );
}
