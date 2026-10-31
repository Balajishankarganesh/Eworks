import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HomeWorks — Home Services Marketplace",
    template: "%s | HomeWorks",
  },
  description:
    "Book trusted home service professionals instantly. Electricians, plumbers, AC repair, carpentry, appliance repair and cleaning — available now.",
  keywords: ["home services", "electrician", "plumber", "AC repair", "booking", "on-demand"],
  authors: [{ name: "HomeWorks" }],
  creator: "HomeWorks",
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: "HomeWorks — Home Services Marketplace",
    description: "Book trusted home service professionals instantly.",
    siteName: "HomeWorks",
  },
  twitter: {
    card: "summary_large_image",
    title: "HomeWorks — Home Services Marketplace",
    description: "Book trusted home service professionals instantly.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-surface-50 font-sans antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "12px",
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              fontWeight: "500",
              padding: "12px 16px",
            },
          }}
        />
      </body>
    </html>
  );
}
