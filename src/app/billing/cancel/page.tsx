import Link from "next/link";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function BillingCancelPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold text-[#111827]">Checkout cancelled</h1>
          <p className="mt-4 text-[#4b5563]">No payment was taken.</p>
          <Link
            href="/pricing"
            className="mt-8 inline-flex rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Back to pricing
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
