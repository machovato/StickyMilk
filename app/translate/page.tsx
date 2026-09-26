import Link from "next/link";
import {
  ArrowLeft,
  Coffee,
  Lightning,
  Thermometer,
} from "@phosphor-icons/react/dist/ssr";
import { isAdminAuthenticated } from "@/lib/auth";
import { TranslatorHUD } from "@/components/TranslatorHUD";
import { extractRecipeIR } from "@/lib/translator/extractor";
import { synthesizeRecipe } from "@/lib/translator/synthesis";
import type { TranslationResult } from "@/lib/translator/types";

export const metadata = {
  title: "The Coffee Translator Engine // StickyMilk",
  description:
    "Translate viral TikTok, Instagram Reels, and YouTube Shorts into calibrated Cometeer, Nespresso Vertuo, and Instant formulations.",
};

interface TranslatePageProps {
  searchParams: Promise<{ url?: string }>;
}

export default async function TranslatePage({ searchParams }: TranslatePageProps) {
  const { url } = await searchParams;
  const isAuth = await isAdminAuthenticated();

  let initialResult: TranslationResult | undefined = undefined;
  if (url) {
    try {
      const ir = extractRecipeIR({ url });
      initialResult = synthesizeRecipe(ir);
    } catch {
      // Ignored for initial server render; handled gracefully on client
    }
  }

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
          COFFEE TRANSLATOR ENGINE
        </span>
        {isAuth && (
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#001ec0] text-white uppercase">
            ADMIN CURATOR
          </span>
        )}
      </div>

      {/* Main Hero Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#001ec0]" />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#001ec0]">
            ON-DEMAND RECIPE INGESTION & CALIBRATION
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

      {/* Interactive Translator HUD */}
      <TranslatorHUD
        initialUrl={url}
        isAdmin={isAuth}
        initialResult={initialResult}
      />

      {/* How The Translator Works: The 3 Superpowers */}
      <div className="flex flex-col gap-4 mt-6 pt-10 border-t-2 border-[#1a130e]/15">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase text-[#001ec0] tracking-wider">
            CANONICAL ENGINE SPECIFICATION
          </span>
        </div>
        <h2 className="font-syne text-xl sm:text-2xl font-bold uppercase text-[#1a130e] tracking-tight">
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
