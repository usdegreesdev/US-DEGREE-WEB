"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";
import { fetchCredits } from "@/lib/auth/api";

const POLL_MS = 1500;
const MAX_POLLS = 10;

/**
 * Stripe redirects here after payment. Credits are granted by the webhook (not
 * by this redirect), which can land a moment later — so poll the balance briefly.
 */
export default function BillingSuccessPage() {
  const { user, loading } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const balance = await fetchCredits();
        if (cancelled) return;
        setCredits(balance);
        if (balance > 0) return;
      } catch {
        // transient — keep polling
      }
      if (cancelled) return;
      if (++polls >= MAX_POLLS) {
        setGaveUp(true);
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loading, user]);

  const ready = credits !== null && credits > 0;

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold text-[#111827]">
            {ready ? "Payment successful" : "Confirming your payment..."}
          </h1>
          <p className="mt-4 text-[#4b5563]">
            {ready
              ? `You have ${credits} report credit${credits === 1 ? "" : "s"} available.`
              : gaveUp
                ? "Your payment is processing. Your credits will appear shortly — refresh in a moment."
                : "This usually takes a few seconds."}
          </p>
          <Link
            href="/compare"
            className="mt-8 inline-flex rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Go to Compare
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
