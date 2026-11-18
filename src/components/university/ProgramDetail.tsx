import React from "react";
import { ProgramDetailProps } from "@/types/university/ProgramDetail";
import { getCredentialLevelInfo } from "@/constants/credentialLevel";

export default function ProgramDetail({
  degree,
  cipCode,
  description,
  credentialLevel,
}: ProgramDetailProps) {
  const credentialInfo = getCredentialLevelInfo(credentialLevel);

  return (
    <div className="mb-10">
      {degree && (
        <h2 className="text-3xl font-bold text-slate-900 font-['Lexend']">
          {degree}
        </h2>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        {credentialInfo && (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
            {credentialInfo.title}
          </span>
        )}

        <span className="text-slate-300">•</span>
        <span className="font-medium text-slate-500">
          CIP Code:
          <span className="ml-1 text-slate-700">{cipCode}</span>
        </span>
      </div>
      {description && (
        <p className="mt-6 max-w-4xl text-base leading-8 text-slate-600 font-['Poppins']">
          {description}
        </p>
      )}
    </div>
  );
}
