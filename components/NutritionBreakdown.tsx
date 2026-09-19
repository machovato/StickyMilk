"use client";

import { Lightning } from "@phosphor-icons/react";
import type { Preparation } from "@/lib/types";
import { calculateNutrition } from "@/lib/nutrition";
import { formatAmount } from "@/lib/format-amount";

interface NutritionBreakdownProps {
  prep: Preparation;
  scale: number;
}

export function NutritionBreakdown({ prep, scale }: NutritionBreakdownProps) {
  const nutrition = calculateNutrition(prep, scale);

  const perServingCaffeine = Math.round(nutrition.caffeine_mg / (prep.servings * scale));

  // Potency categorization based on total batch caffeine
  let potencyLabel = "Standard Active Dose";
  if (nutrition.caffeine_mg <= 10) {
    potencyLabel = "Decaf Formulation";
  } else if (nutrition.caffeine_mg >= 400) {
    potencyLabel = "Peak Intake (≥400 mg FDA Benchmark)";
  } else if (nutrition.caffeine_mg >= 240) {
    potencyLabel = "High-Potency Batch";
  } else if (nutrition.caffeine_mg < 100) {
    potencyLabel = "Mild Extraction";
  }

  // Caffeine meter percentage relative to 400mg FDA daily recommended benchmark
  const caffeineMeterPercent = Math.min(
    100,
    Math.max(8, Math.round((nutrition.caffeine_mg / 400) * 100))
  );

  return (
    <div className="bg-white p-5 border border-[#1a130e]/15 shadow-sm flex flex-col gap-4 text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a130e]/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#001ec0]" />
          <span className="font-mono text-[11px] font-bold uppercase text-[#1a130e] tracking-wider">
            WIIFM (WHAT&apos;S IN IT FOR ME)
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#7f756f] uppercase font-bold">
          {scale}x ({formatAmount(prep.servings * scale)}{" "}
          {prep.yield_unit ?? (prep.servings * scale === 1 ? "DRINK" : "DRINKS")})
        </span>
      </div>

      {/* 4-Macro Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#f8f2ee] p-2.5 border border-[#1a130e]/10 flex flex-col">
          <span className="font-mono text-[10px] uppercase text-[#7f756f]">
            Calories
          </span>
          <span className="font-syne text-lg font-bold text-[#1a130e] mt-0.5">
            {nutrition.calories}
          </span>
          <span className="font-mono text-[9px] text-[#7f756f] mt-0.5">
            kcal
          </span>
        </div>

        <div className="bg-[#f8f2ee] p-2.5 border border-[#1a130e]/10 flex flex-col">
          <span className="font-mono text-[10px] uppercase text-[#001ec0] font-bold">
            Sucrose / Sugar
          </span>
          <span className="font-syne text-lg font-bold text-[#001ec0] mt-0.5">
            {nutrition.sugar_g}g
          </span>
          <span className="font-mono text-[9px] text-[#4d4540] mt-0.5">
            sweetness base
          </span>
        </div>

        <div className="bg-[#f8f2ee] p-2.5 border border-[#1a130e]/10 flex flex-col">
          <span className="font-mono text-[10px] uppercase text-[#7f756f]">
            Milk Fat
          </span>
          <span className="font-syne text-lg font-bold text-[#1a130e] mt-0.5">
            {nutrition.fat_g}g
          </span>
          <span className="font-mono text-[9px] text-[#7f756f] mt-0.5">
            lipid emulsion
          </span>
        </div>

        <div className="bg-[#f8f2ee] p-2.5 border border-[#1a130e]/10 flex flex-col">
          <span className="font-mono text-[10px] uppercase text-[#7f756f]">
            Protein
          </span>
          <span className="font-syne text-lg font-bold text-[#1a130e] mt-0.5">
            {nutrition.protein_g}g
          </span>
          <span className="font-mono text-[9px] text-[#7f756f] mt-0.5">
            dairy solid
          </span>
        </div>
      </div>

      {/* Caffeine Impact Card */}
      <div className="bg-[#1a130e] text-white p-3.5 border border-[#1a130e] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Lightning size={16} weight="fill" className="text-[#b8f600]" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#b8f600]">
              Caffeine Impact
            </span>
          </div>
          <span className="font-syne text-base font-bold text-white">
            ~{nutrition.caffeine_mg} mg
          </span>
        </div>

        <div className="w-full bg-[#221a15] h-2.5 border border-white/10 overflow-hidden relative">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              nutrition.caffeine_mg >= 400 ? "bg-[#ff4343]" : "bg-[#b8f600]"
            }`}
            style={{ width: `${caffeineMeterPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-[#d1c4bd]">
          <span>{potencyLabel}</span>
          <span>{scale > 1 ? `~${perServingCaffeine} mg/serving · 400 mg max ref` : "400 mg FDA daily max ref"}</span>
        </div>
      </div>

      {/* Lab Standard Footnote */}
      <p className="font-body text-[11px] text-[#7f756f] leading-tight">
        *Benchmarked with whole milk (3.5% fat) &amp; traditional sweetened condensed milk. Using 2% or plant milks reduces fat by ~1.5g.
      </p>
    </div>
  );
}
