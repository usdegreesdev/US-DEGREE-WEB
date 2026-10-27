/** Small gold "PRO" tag for paid members. Render only when `isPaidActive`. */
export default function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Pro member"
      className={`inline-flex items-center rounded-[4px] bg-pro-bg px-[7px] py-[2px] text-[10px] font-bold uppercase leading-none tracking-[0.04em] text-pro-fg ${className}`}
    >
      PRO
    </span>
  );
}
