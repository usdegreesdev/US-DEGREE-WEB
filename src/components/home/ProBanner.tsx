import React from "react";
import Link from "next/link";

export default function ProBanner() {
  return (
    <section className="px-4 sm:px-10 lg:px-[86px] py-8 sm:py-12 flex justify-center">
      <div className="w-full max-w-[2380px] bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 shadow-2xl shadow-blue-900/20">
        {/* LEFT TEXT */}
        <div className="text-white max-w-lg text-center md:text-left">
          <h2 className="text-xl sm:text-3xl font-bold mb-2 sm:mb-4">
            Unlock Earnings Insights Pro
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm leading-relaxed">
            Get access to exclusive salary data for every major, including
            projected 10-year earnings and life-long returns.
          </p>
        </div>

        {/* RIGHT ACTION */}
        <div className="flex flex-col items-center bg-white/10 p-4 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/20 min-w-[180px] sm:min-w-[200px] w-full md:w-auto">
          <span className="text-blue-200 text-[10px] sm:text-xs font-bold tracking-wider mb-2">
            ANNUAL PLAN
          </span>
          <Link
            href="/pricing"
            className="bg-white text-blue-600 font-bold py-2.5 px-6 sm:py-3 sm:px-8 rounded-full text-xs sm:text-sm w-full text-center hover:bg-gray-50 transition-colors shadow-lg"
          >
            Go Pro Today
          </Link>
        </div>
      </div>
    </section>
  );
}
