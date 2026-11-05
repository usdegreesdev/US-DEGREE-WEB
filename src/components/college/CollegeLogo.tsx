"use client";

import { useState } from "react";
import Image from "next/image";
import { getCollegeLogoUrl } from "@/lib/collegeImages";

interface CollegeLogoProps {
  unitid?: string | number | null;
  name: string;
  /** Box size/shape/color classes; applied while showing the initial fallback. */
  className: string;
  /** Text classes for the fallback initial. */
  textClassName?: string;
  /** Rendered size hint for the image (the box is sized by className). */
  sizes?: string;
}

type Status = "pending" | "loaded" | "failed";

/**
 * College logo from R2. The fixed-size box is always rendered (no layout
 * shift); the initial shows until the image loads, and stays if it 404s.
 */
export default function CollegeLogo({
  unitid,
  name,
  className,
  textClassName = "",
  sizes = "48px",
}: CollegeLogoProps) {
  const src = getCollegeLogoUrl(unitid);
  const [state, setState] = useState<{ src: string | null; status: Status }>({
    src,
    status: "pending",
  });
  // Reset when the college changes (lists may reuse component instances).
  const status: Status = state.src === src ? state.status : "pending";
  const loaded = status === "loaded";

  return (
    <div
      className={`${className} relative overflow-hidden ${loaded ? "!bg-white border border-gray-100" : ""}`}
    >
      {!loaded && (
        <span className={textClassName}>
          {name ? name.trim().charAt(0).toUpperCase() : "U"}
        </span>
      )}
      {src && status !== "failed" && (
        <Image
          src={src}
          alt={`${name} logo`}
          fill
          sizes={sizes}
          unoptimized
          loading="lazy"
          className={`object-contain p-0.5 transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setState({ src, status: "loaded" })}
          onError={() => setState({ src, status: "failed" })}
        />
      )}
    </div>
  );
}
