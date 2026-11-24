"use client";

import CollegeLogo from "@/components/college/CollegeLogo";

interface CollegeAvatarProps {
  name: string;
  /** IPEDS unitid — used to load the logo from the R2 bucket. */
  unitid?: string | number | null;
  /** "lg" is used in the desktop table header, "md" in the mobile top card. */
  size?: "lg" | "md";
}

const SIZE_CLASSES = {
  lg: "w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl p-2 md:p-3 mb-2 md:mb-4",
  md: "w-12 h-12 rounded-xl p-2",
};

const FALLBACK_TEXT_SIZE = {
  lg: "text-sm md:text-lg",
  md: "text-sm",
};

const IMAGE_SIZES = { lg: "80px", md: "48px" };

/**
 * The college marker shown in the desktop table header and the mobile
 * "school directory" cards. Shows the logo from R2 when it exists, and
 * falls back to a colored initial otherwise.
 */
export default function CollegeAvatar({ name, unitid, size = "lg" }: CollegeAvatarProps) {
  return (
    <div
      className={`bg-white border border-gray-100 shrink-0 shadow-sm ${SIZE_CLASSES[size]}`}
    >
      <CollegeLogo
        unitid={unitid}
        name={name}
        sizes={IMAGE_SIZES[size]}
        className="w-full h-full rounded-lg bg-blue-100 flex items-center justify-center"
        textClassName={`font-bold text-[#3F51B5] ${FALLBACK_TEXT_SIZE[size]} select-none`}
      />
    </div>
  );
}
