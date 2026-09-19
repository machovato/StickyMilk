import type { Metadata } from "next";
import { Syne, Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { AdminHeaderControls } from "@/components/AdminHeaderControls";
import { ChannelProvider } from "@/lib/channel-context";
import { Footer } from "@/components/Footer";
import { HeaderChannelSelector } from "@/components/HeaderChannelSelector";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-vietnam",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "StickyMilk Lab // Archive",
  description:
    "Vietnamese specialty coffee laboratory & extraction matrix for condensed milk formulas, cold extractions, and accelerated brew dynamics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${beVietnamPro.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#fef8f4] text-[#1d1b19] font-body selection:bg-[#001ec0] selection:text-white">
        <ChannelProvider>
          <header className="sticky top-0 z-50 bg-[#fef8f4]/90 backdrop-blur-xl border-b border-[#1a130e]/10 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
            <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
              {/* Brand identity */}
              <div className="flex items-center gap-6 flex-shrink-0">
                <Link href="/" className="flex items-center gap-2.5 group text-left">
                  <div className="w-9 h-9 bg-[#1a130e] flex items-center justify-center transition-transform group-hover:scale-105">
                    <span className="text-white font-syne font-bold text-xl leading-none">
                      S
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-syne font-bold text-xl uppercase tracking-tight text-[#1a130e] leading-none">
                      STICKYMILK
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#001ec0]">
                      LAB // ARCHIVE
                    </span>
                  </div>
                </Link>
              </div>

              {/* Global Channel Selector */}
              <div className="flex items-center justify-center">
                <HeaderChannelSelector />
              </div>

              {/* Status / Links */}
              <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                <div className="hidden lg:flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest px-2 py-1 bg-[#b8f600] text-[#141f00]">
                    v2.4
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[#4d4540]">
                    Zero Phin Formulations
                  </span>
                </div>
                <AdminHeaderControls />
              </div>
            </div>
          </header>

          <main className="w-full flex-1">
            {children}
          </main>

          <Footer />
        </ChannelProvider>
      </body>
    </html>
  );
}
