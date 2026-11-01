import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// ============================================================
// FONT: Menggunakan Inter dari Google Fonts via next/font
// next/font otomatis mengoptimalkan loading font (zero layout shift)
// ============================================================
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "MemoriAI — Smart Memory Retrieval Agent",
  description:
    "Temukan foto kenangan kamu dengan cara yang natural menggunakan AI. Cukup ceritakan momennya!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      {/* suppressHydrationWarning mencegah warning saat ada perbedaan
          kecil antara render server dan client (umum di Next.js) */}
      <body suppressHydrationWarning className="antialiased font-[var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
