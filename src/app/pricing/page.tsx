import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PricingPlans from "@/components/pricing/PricingPlans";
import { getSiteUrl } from "@/lib/env";

const title = "Pricing: Free & Pro Plans | US Degrees";
const description =
  "Start free, or go Pro to unlock outcomes for 200K+ U.S. programs and customizable compare reports. Try Pro free.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: `${getSiteUrl()}/pricing`, type: "website" },
  alternates: { canonical: `${getSiteUrl()}/pricing` },
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <section className="relative overflow-hidden bg-[#f5f8fc] px-4 sm:px-10 lg:px-[86px] py-14 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_58%_20%,rgba(186,235,227,0.85)_0%,rgba(186,235,227,0.55)_25%,rgba(186,235,227,0.22)_45%,rgba(255,255,255,0)_72%)]"
        />

        <div className="relative max-w-[1400px] mx-auto">
          <div className="text-center mb-12 lg:mb-16">
            <span className="mb-5 inline-block rounded-full bg-[#ff3b30] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
              Pricing
            </span>
            <h1 className="mx-auto max-w-[800px] text-[36px] sm:text-[52px] lg:text-[64px] font-bold leading-[0.98] tracking-[-0.04em] text-[#111827]">
              The Neutral Way to Go
              <span className="text-[#3b5bdb]"> Pro</span>
            </h1>
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[14px] sm:text-[20px] text-[#1f2937] tracking-[-0.01em]">
              <span>Family-funded</span>
              <span className="text-[#9ca3af] text-[8px]" aria-hidden="true">
                ●
              </span>
              <span>Conflict-free</span>
              <span className="text-[#9ca3af] text-[8px]" aria-hidden="true">
                ●
              </span>
              <span>Built on verified data</span>
            </p>
            <p className="mx-auto mt-5 max-w-[650px] text-[16px] sm:text-[18px] leading-[1.4] text-[#4b5563]">
              Start free and explore every program. Go Pro to see real
              outcomes and compare your top choices with confidence.
            </p>
          </div>

          <PricingPlans />
        </div>
      </section>

      <Footer />
    </main>
  );
}
