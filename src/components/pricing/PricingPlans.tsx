"use client";

import { useState } from "react";
import Link from "next/link";
import { message } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";

import { useAuth } from "@/context/AuthContext";
import { createCheckoutSession } from "@/lib/auth/api";

const FREE_FEATURES = [
  "Browse colleges and programs",
  "Check your fit score",
  "Intelligent matches according to your preferences",
  "Shortlist top colleges",
];

const PRO_FEATURES = [
  "Unlock outcomes for 200K+ programs across the United States",
  "Generate customizable compare reports for the colleges you select",
];

function FeatureItem({
  children,
  onDark = false,
}: {
  children: React.ReactNode;
  onDark?: boolean;
}) {
  return (
    <li className="flex items-start gap-3 text-[14px] sm:text-[15px] leading-[1.5]">
      <CheckCircleFilled
        className={`mt-[3px] text-[16px] ${onDark ? "text-white" : "text-[#3b5bdb]"}`}
      />
      <span className={onDark ? "text-white" : "text-[#4b5563]"}>
        {children}
      </span>
    </li>
  );
}

export default function PricingPlans() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [checkingOut, setCheckingOut] = useState(false);

  const openAuth = (mode: "login" | "signup") => {
    window.dispatchEvent(
      new CustomEvent("open-auth-modal", { detail: { mode } }),
    );
  };

  const handleStartTrial = () => {
    if (!isLoggedIn) {
      openAuth("signup");
      return;
    }
    if (checkingOut) return;
    setCheckingOut(true);
    createCheckoutSession()
      .then(({ url }) => {
        window.location.assign(url);
      })
      .catch(() => {
        message.error("Couldn't start checkout. Please try again.");
        setCheckingOut(false);
      });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 max-w-[960px] mx-auto items-stretch">
      {/* Free tier */}
      <div className="flex flex-col rounded-[2rem] bg-white border border-[#e5e7eb] p-7 sm:p-10 shadow-[0_8px_24px_rgba(99,102,241,0.06)]">
        <h2 className="text-[22px] sm:text-[26px] font-extrabold text-[#111827]">
          Free
        </h2>
        <p className="mt-1 text-[14px] text-[#4b5563]">
          Everything you need to start exploring.
        </p>

        <div className="mt-6 flex items-baseline gap-1.5">
          <span className="text-[44px] sm:text-[52px] font-black leading-none tracking-[-0.03em] text-[#111827]">
            $0
          </span>
          <span className="text-[14px] text-[#4b5563]">/ forever</span>
        </div>

        <hr className="my-7 border-[#e5e7eb]" />

        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#4b5563]">
          What&apos;s included
        </p>
        <ul className="flex flex-col gap-3.5">
          {FREE_FEATURES.map((f) => (
            <FeatureItem key={f}>{f}</FeatureItem>
          ))}
        </ul>

        <div className="mt-auto pt-9">
          {isLoggedIn ? (
            <Link
              href="/search"
              className="inline-flex w-full items-center justify-center rounded-full bg-white hover:bg-gray-50 text-blue-600 border border-blue-100/60 px-8 py-3.5 text-sm sm:text-base font-semibold shadow-sm transition-colors"
            >
              Start Exploring
            </Link>
          ) : (
            <button
              onClick={() => openAuth("signup")}
              className="inline-flex w-full items-center justify-center rounded-full bg-white hover:bg-gray-50 text-blue-600 border border-blue-100/60 px-8 py-3.5 text-sm sm:text-base font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Get Started Free
            </button>
          )}
        </div>
      </div>

      {/* Pro tier */}
      <div className="relative flex flex-col rounded-[2rem] bg-gradient-to-r from-indigo-600 to-blue-500 p-7 sm:p-10 shadow-2xl shadow-blue-900/20">
        {/* <span className="absolute right-6 top-6 sm:right-8 sm:top-8 rounded-full bg-[#ff3b30] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white">
          Free trial
        </span> */}

        <h2 className="text-[22px] sm:text-[26px] font-extrabold text-white">
          Pro
        </h2>
        <p className="mt-1 text-[14px] text-blue-100">
          For students ready to decide with confidence.
        </p>

        <div className="mt-6 flex items-baseline gap-1.5">
          <span className="text-[44px] sm:text-[52px] font-black leading-none tracking-[-0.03em] text-white">
            $1
          </span>
          <span className="text-[14px] text-blue-100">/ month</span>
        </div>

        <hr className="my-7 border-white/20" />

        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-blue-200">
          Everything in Free, plus
        </p>
        <ul className="flex flex-col gap-3.5">
          {PRO_FEATURES.map((f) => (
            <FeatureItem key={f} onDark>
              {f}
            </FeatureItem>
          ))}
        </ul>

        <hr className="my-7 border-white/20" />

        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-blue-200">
          Also included
        </p>
        <ul className="flex flex-col gap-3.5">
          {FREE_FEATURES.map((f) => (
            <FeatureItem key={f} onDark>
              {f}
            </FeatureItem>
          ))}
        </ul>

        <div className="mt-auto pt-9">
          <button
            onClick={handleStartTrial}
            disabled={checkingOut}
            className="inline-flex w-full items-center justify-center rounded-full bg-white hover:bg-gray-50 text-blue-600 px-8 py-3.5 text-sm sm:text-base font-bold shadow-lg transition-colors cursor-pointer"
          >
            {checkingOut ? "Redirecting to checkout..." : "Go Pro Today"}
          </button>
        </div>
      </div>
    </div>
  );
}
