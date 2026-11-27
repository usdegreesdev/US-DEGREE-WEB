"use client";

import React, { useState } from "react";
import { Tooltip } from "antd";

interface DisclaimerTooltipProps {
  text: string;
  className?: string;
  /** Overrides antd's 250px default for longer disclaimers. */
  maxWidth?: number;
}

/**
 * A small "?" affordance that reveals a data-source disclaimer.
 *  - Hover opens it after a short delay so a mouse passing over the screen
 *    doesn't trigger it, and closes the instant the cursor leaves.
 *  - Keyboard users reach it via Tab; it opens on focus, closes on blur or
 *    Escape.
 *  - Touch devices (no hover) get tap-to-open/tap-to-close instead.
 *  - Placement auto-flips so it's never clipped by the viewport edge, and it
 *    renders in a portal so table overflow / sticky cells can't clip it.
 *  - The full text is exposed via `aria-label` so screen readers announce it
 *    without needing the tooltip to be open.
 */
export default function DisclaimerTooltip({
  text,
  className,
  maxWidth,
}: DisclaimerTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Tooltip
      title={text}
      open={open}
      onOpenChange={setOpen}
      trigger={["hover", "focus", "click"]}
      mouseEnterDelay={0.25}
      mouseLeaveDelay={0}
      autoAdjustOverflow
      placement="top"
      styles={maxWidth ? { root: { maxWidth } } : undefined}
    >
      <button
        type="button"
        aria-label={`Data source disclaimer: ${text}`}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        className={[
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[10px] font-bold leading-none text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        ?
      </button>
    </Tooltip>
  );
}
