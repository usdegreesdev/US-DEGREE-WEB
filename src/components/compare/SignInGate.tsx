"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/** Compact frosted-glass "sign in" prompt floated over blurred compare values. */
export function SignInCard() {
  const router = useRouter();

  return (
    <div
      role="region"
      aria-label="Sign in required"
      className="glass-card pointer-events-auto flex flex-col items-center gap-4 px-8 py-7 text-center w-full max-w-[280px]"
    >
      <p className="text-base md:text-lg font-black text-slate-900 leading-snug">
        Sign in to unlock the full comparison
      </p>
      <button
        type="button"
        onClick={() => router.push("/?login=1")}
        className="rounded-xl bg-[#3F51B5] px-8 py-3 text-sm font-black text-white shadow-md hover:bg-[#32408f] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3F51B5]"
      >
        Sign In
      </button>
    </div>
  );
}

interface SignInGateProps {
  children: ReactNode;
  /** Classes for the wrapper (e.g. layout/spacing of the gated content). */
  className?: string;
}

/**
 * For signed-out visitors, marks its content as gated (only the values inside
 * `.compare-values` are blurred, via globals.css) and floats a sign-in card
 * over it. The card is a sibling of the content, so it is never blurred.
 * Signed-in users (and the brief auth loading state) see the content untouched.
 */
export default function SignInGate({ children, className = "" }: SignInGateProps) {
  const { user, loading } = useAuth();

  if (user || loading) return <div className={className}>{children}</div>;

  return (
    <div className="relative">
      <div data-gated="true" inert className={className}>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-start justify-center px-4 pointer-events-none">
        <div className="sticky top-32 mt-24 w-full flex justify-center">
          <SignInCard />
        </div>
      </div>
    </div>
  );
}
