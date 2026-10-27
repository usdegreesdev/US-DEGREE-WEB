import type { Metadata } from "next";
import { connection } from "next/server";
import { Lexend, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BillingProvider } from "@/context/BillingContext";
import PopupConfig from "@/components/layout/PopupConfig";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-lexend",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "US Degrees",
  description: "Search universities in the US",
  icons: {
    icon: '/images/cap.png',
  },
};

/**
 * Forces every route under this layout to render at request time.
 *
 * Required by the nonce-based CSP in src/proxy.ts: Next.js stamps the nonce
 * onto script tags during SSR, reading it from the request's CSP header. A
 * page prerendered at build time has no request and therefore no nonce, so its
 * script tags would fail the 'strict-dynamic' policy and the browser would
 * block the entire bundle. Forcing dynamic rendering here (rather than in each
 * page) covers the three client-component pages, which cannot use route
 * segment config.
 *
 * Cost: static optimisation and CDN edge caching are disabled app-wide. That
 * is the documented trade-off for nonce-based CSP.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  return (
    <AuthProvider>
      <html lang="en" className={`${lexend.variable} ${poppins.variable}`}>
        <body className={lexend.className}>
          <BillingProvider>
            <PopupConfig />
            {children}
          </BillingProvider>
        </body>
      </html>
    </AuthProvider>
  );
}
