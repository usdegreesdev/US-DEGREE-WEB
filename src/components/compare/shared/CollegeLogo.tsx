"use client";

import BaseCollegeLogo from "@/components/college/CollegeLogo";

interface CollegeLogoProps {
  name: string;
  /** IPEDS unitid — used to load the logo from the R2 bucket. */
  unitid?: string | number | null;
  /** Pixel size of the square logo box. Defaults to 24 (used in mobile rows). */
  size?: number;
}

/**
 * Small square college logo (R2 image, colored initial as fallback), used in
 * the mobile metric rows.
 */
export default function CollegeLogo({ name, unitid, size = 24 }: CollegeLogoProps) {
  return (
    <div
      className="bg-white border border-gray-100 rounded p-0.5 shrink-0"
      style={{ width: size, height: size }}
    >
      <BaseCollegeLogo
        unitid={unitid}
        name={name}
        sizes={`${size}px`}
        className="w-full h-full rounded bg-blue-50 flex items-center justify-center"
        textClassName="font-bold text-[#3F51B5] text-[10px] select-none"
      />
    </div>
  );
}
