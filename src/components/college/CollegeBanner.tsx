"use client";

import { useState } from "react";
import Image from "next/image";
import { getCollegeBannerUrl } from "@/lib/collegeImages";

const DEFAULT_BANNER = "/images/2.jpg";

interface CollegeBannerProps {
  unitid?: string | number | null;
  name: string;
}

/**
 * Fills its positioned parent with the college's R2 banner, falling back to
 * the default campus image if it is missing or fails to load.
 */
export default function CollegeBanner({ unitid, name }: CollegeBannerProps) {
  const remote = getCollegeBannerUrl(unitid);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const useRemote = !!remote && failedSrc !== remote;

  if (!useRemote) {
    return (
      <Image
        src={DEFAULT_BANNER}
        alt={`${name} campus`}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
    );
  }

  // R2 banners are wide (~2.9:1) while the container ranges from ~1.5:1
  // (mobile) to ~5:1 (desktop), so cover would crop them. Show the whole image
  // (contain) over a blurred copy of itself so there are no empty bars.
  return (
    <>
      <Image
        src={remote}
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        unoptimized
        className="object-cover scale-110 blur-xl"
      />
      <Image
        src={remote}
        alt={`${name} campus`}
        fill
        priority
        sizes="100vw"
        unoptimized
        className="object-contain"
        onError={() => setFailedSrc(remote)}
      />
    </>
  );
}
