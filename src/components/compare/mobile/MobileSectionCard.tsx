interface MobileSectionCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

/** White rounded card wrapper used by every metric section in the mobile comparison view. */
export default function MobileSectionCard({ title, subtitle, children }: MobileSectionCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="mb-3">
        <h4 className="font-extrabold text-slate-800 text-sm">{title}</h4>
        <p className="text-[10px] text-gray-400 font-semibold">{subtitle}</p>
      </div>
      <div className="compare-values divide-y divide-gray-100">{children}</div>
    </div>
  );
}
