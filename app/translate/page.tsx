import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Coffee,
  Lightning,
  Thermometer,
} from "@phosphor-icons/react/dist/ssr";
import { isAdminAuthenticated } from "@/lib/auth";

export const metadata = {
  title: "Coffee Translator // StickyMilk",
  description:
    "Translate viral TikTok and Instagram coffee recipes into calibrated Cometeer, Nespresso Vertuo, and Instant formulations.",
};

interface TranslatePageProps {
  searchParams: Promise<{ url?: string }>;
}

export default async function TranslatePage({ searchParams }: TranslatePageProps) {
  const { url } = await searchParams;
  const isAuth = await isAdminAuthenticated();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-10 text-left">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase font-bold text-[#001ec0] hover:text-[#1a130e] transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Back to Front Door</span>
        </Link>
        <span className="text-[#d1c4bd]">|</span>
        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#b8f600] text-[#141f00] uppercase">
          SPRINT 4 STAGING
        </span>
      </div>

      {/* Main Hero Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#001ec0]" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#001ec0]">
            ON-DEMAND RECIPE INGESTION
          </span>
        </div>
        <h1 className="font-syne text-3xl sm:text-5xl font-extrabold text-[#1a130e] tracking-tight leading-[1.1]">
          The Coffee Translator Engine
        </h1>
        <p className="font-body text-base sm:text-lg text-[#4d4540] max-w-2xl leading-relaxed">
          You saw a trending coffee drink on social media. Bring the link to StickyMilk.
          We convert the espresso shot to your home machine, calculate honest macros,
          and stage foolproof kitchen steps.
        </p>
      </div>

      {/* Ingestion Input Card */}
      <div className="bg-white p-6 sm:p-8 border-2 border-black shadow-lg flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs font-bold uppercase text-[#1a130e] tracking-wider">
            PASTE REEL OR VIDEO URL
          </span>
          <p className="font-body text-xs text-[#7f756f]">
            Supports TikTok links, Instagram Reels, and YouTube Shorts.
          </p>
        </div>

        <form
          action={isAuth ? "/recipes/new" : undefined}
          method={isAuth ? "GET" : undefined}
          className="flex flex-col sm:flex-row items-stretch gap-3"
        >
          <input
            type="url"
            name="importUrl"
            defaultValue={url || ""}
            placeholder="https://www.tiktok.com/@creator/video/... or https://www.instagram.com/reel/..."
            className="flex-1 px-4 py-3.5 bg-[#fef8f4] text-[#1a130e] placeholder-[#a89e97] font-mono text-xs sm:text-sm border-2 border-[#1a130e]/30 focus:border-[#1a130e] focus:outline-none"
          />
          <button
            type="submit"
            className="px-6 py-3.5 bg-[#1a130e] hover:bg-[#001ec0] text-[#b8f600] font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-colors border-2 border-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <span>{isAuth ? "LOAD IN LAB" : "TRANSLATE FOR MY COFFEE"}</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </form>

        {!isAuth && (
          <div className="p-3 bg-[#f8f2ee] border border-[#1a130e]/10 text-xs font-mono text-[#7f756f]">
            💡 <strong>Sprint 4 Ingestion Pipeline:</strong> Public link intake is being hooked up directly
            to Tony&apos;s test kitchen queue. Admin curators can{" "}
            <Link href="/admin/login" className="text-[#001ec0] underline font-bold">
              log in
            </Link>{" "}
            to parse and publish drafts immediately.
          </div>
        )}
      </div>

      {/* The 3 Superpowers */}
      <div className="flex flex-col gap-4">
        <h2 className="font-syne text-xl font-bold uppercase text-[#1a130e] tracking-tight">
          How The Translator Works: 3 Superpowers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Superpower 1 */}
          <div className="bg-white p-6 border-2 border-[#1a130e]/15 flex flex-col gap-3 shadow-sm">
            <div className="w-9 h-9 bg-[#1a130e] text-[#b8f600] flex items-center justify-center font-bold">
              <Coffee size={20} weight="fill" />
            </div>
            <h3 className="font-syne text-lg font-bold text-[#1a130e]">
              1. Hardware Brew Math
            </h3>
            <p className="font-body text-xs sm:text-sm text-[#4d4540] leading-relaxed">
              Videos rarely explain extraction physics. We calculate the exact ratio for
              Cometeer (26g frozen melt), Nespresso Vertuo (single/double pull), and instant
              hot bloom so your drink never turns into coffee-flavored milk water.
            </p>
          </div>

          {/* Superpower 2 */}
          <div className="bg-white p-6 border-2 border-[#1a130e]/15 flex flex-col gap-3 shadow-sm">
            <div className="w-9 h-9 bg-[#001ec0] text-white flex items-center justify-center font-bold">
              <Lightning size={20} weight="fill" />
            </div>
            <h3 className="font-syne text-lg font-bold text-[#1a130e]">
              2. Nutritional Reality Check
            </h3>
            <p className="font-body text-xs sm:text-sm text-[#4d4540] leading-relaxed">
              Viral creators hide the syrups and sweetened condensed milk. We run actual macro
              benchmarks revealing Calories, Caffeine (mg), and Sugar (g) with honest human reference
              points (e.g. <em>&ldquo;~1.9 cups of coffee&rdquo;</em>).
            </p>
          </div>

          {/* Superpower 3 */}
          <div className="bg-white p-6 border-2 border-[#1a130e]/15 flex flex-col gap-3 shadow-sm">
            <div className="w-9 h-9 bg-[#b8f600] text-[#141f00] flex items-center justify-center font-bold">
              <Thermometer size={20} weight="bold" />
            </div>
            <h3 className="font-syne text-lg font-bold text-[#1a130e]">
              3. Kitchen Mise en Place
            </h3>
            <p className="font-body text-xs sm:text-sm text-[#4d4540] leading-relaxed">
              Video cuts trick you into making cold foam while hot espresso melts the ice.
              We sequence preparation steps with kitchen physics: whip cold foam first, stage
              the glass, and pull espresso directly over ice last.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
