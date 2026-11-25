import type { Metadata } from "next";
import { connection } from "next/server";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import PopupConfig from "@/components/layout/PopupConfig";

// Fonts are self-hosted (latin subset, from Google Fonts) so dev and builds
// never need network access to fonts.googleapis.com.
const lexend = localFont({
  src: "./fonts/Lexend-Variable.woff2",
  weight: "400 900",
  style: "normal",
  display: "swap",
  variable: "--font-lexend",
});

const poppins = localFont({
  src: [
    { path: "./fonts/Poppins-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Poppins-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/Poppins-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/Poppins-800.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
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
          <PopupConfig />
          {children}
        </body>
      </html>
    </AuthProvider>
  );
}
