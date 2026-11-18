import React from "react";

import { AboutSectionProps } from "@/types/university/AboutSection";

export default function AboutSection({ name, description }: AboutSectionProps) {
  // No generated "distinguished institution" blurb: without the school's own
  // description there is nothing to say, so the section is not shown.
  if (!description) return null;
  return (
    <div className="mb-10">
      <h2 className="text-[28px] font-bold text-slate-900 mb-5 font-['Lexend']  border-slate-900 pb-1 leading-none">
        About {name}
      </h2>
      <p className="text-slate-500 text-base leading-relaxed font-['Poppins'] max-w-4xl">
        {description}
      </p>
    </div>
  );
}
