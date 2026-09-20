"use client";

import { Lightning, Cookie } from "@phosphor-icons/react";
import type { Preparation } from "@/lib/types";
import { calculateNutrition } from "@/lib/nutrition";
import { formatAmount } from "@/lib/format-amount";

interface NutritionBreakdownProps {
  prep: Preparation;
  scale: number;
}

function getCaffeineReference(mg: number): string {
  if (mg <= 15) return "Decaf · trace caffeine";
  const cups = (mg / 95).toFixed(1).replace(/\.0$/, "");
  if (mg >= 350) return `≈ ${cups} cups of coffee (near 400 mg daily limit)`;
  if (mg >= 180) return `≈ ${cups} cups of brewed coffee`;
  if (mg >= 80) return `≈ ${cups} cup${cups === "1" ? "" : "s"} of brewed coffee`;
  return `≈ ${cups} cup of coffee (mild)`;
}

function getSugarReference(grams: number): string {
  if (grams === 0) return "Zero added sugar";
  if (grams >= 30) return "Over a full day's added sugar (AHA daily rec ~25–36g)";
  if (grams >= 20) return "Almost a full day's added sugar (~80% of daily rec)";
  if (grams >= 10) return "~Half of daily added sugar target";
  return "Light sweetness (< daily limit)";
}

export function NutritionBreakdown({ prep, scale }: NutritionBreakdownProps) {
  const nutrition = calculateNutrition(prep, scale);
  const totalServings = Math.max(1, prep.servings * scale);

  const perServingCaffeine = Math.round(nutrition.caffeine_mg / totalServings);
  const perServingSugar = Math.round((nutrition.sugar_g / totalServings) * 10) / 10;
  const perServingCalories = Math.round(nutrition.calories / totalServings);
  const perServingFat = Math.round((nutrition.fat_g / totalServings) * 10) / 10;
  const perServingProtein = Math.round((nutrition.protein_g / totalServings) * 10) / 10;

  // Caffeine meter percentage relative to 400mg FDA daily recommended benchmark
  const caffeineMeterPercent = Math.min(
    100,
    Math.max(6, Math.round((perServingCaffeine / 400) * 100))
  );

  return (
    <div className="bg-white p-5 border border-[#1a130e]/15 shadow-sm flex flex-col gap-4 text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a130e]/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#001ec0]" />
          <span className="font-mono text-[11px] font-bold uppercase text-[#1a130e] tracking-wider">
            CAFFEINE &amp; NUTRITION PER SERVING
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#7f756f] uppercase font-bold">
          {scale > 1
            ? `${scale}x batch (${formatAmount(totalServings)} ${prep.yield_unit ?? "servings"})`
            : `1 serving (${formatAmount(prep.servings)} ${prep.yield_unit ?? "drink"})`}
        </span>
      </div>

      {/* 2 Primary Impact Cards: Caffeine & Sugar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Caffeine Impact Card with Meter */}
        <div className="bg-[#1a130e] text-white p-3.5 border border-[#1a130e] flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Lightning size={16} weight="fill" className="text-[#b8f600]" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#b8f600]">
                Caffeine
              </span>
            </div>
            <span className="font-syne text-xl font-bold text-white">
              ~{perServingCaffeine} mg
            </span>
          </div>

          <div className="w-full bg-[#2a221b] h-2 border border-white/10 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                perServingCaffeine >= 350 ? "bg-[#ff4343]" : "bg-[#b8f600]"
              }`}
              style={{ width: `${caffeineMeterPercent}%` }}
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs font-bold text-[#fef8f4]">
              {getCaffeineReference(perServingCaffeine)}
            </span>
            <span className="font-mono text-[10px] text-[#a89e97]">
              400 mg FDA daily max reference
            </span>
          </div>
        </div>

        {/* Sugar Impact Card with Reference Point */}
        <div className="bg-[#f8f2ee] p-3.5 border border-[#1a130e]/15 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Cookie size={16} weight="bold" className="text-[#001ec0]" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#001ec0]">
                Sugar
              </span>
            </div>
            <span className="font-syne text-xl font-bold text-[#1a130e]">
              {perServingSugar}g
            </span>
          </div>

          <p className="font-mono text-xs font-bold text-[#1a130e]">
            {getSugarReference(perServingSugar)}
          </p>

          <span className="font-mono text-[10px] text-[#7f756f]">
            Primarily from sweetened condensed milk or syrups
          </span>
        </div>
      </div>

      {/* Secondary Macros: Calories, Fat, Protein */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#1a130e]/10">
        <div className="bg-[#fcfaf8] p-2 border border-[#1a130e]/10 flex flex-col">
          <span className="font-mono text-[10px] uppercase text-[#7f756f]">
            Calories
          </span>
          <span className="font-syne text-base font-bold text-[#1a130e] mt-0.5">
            ~{perServingCalories}
          </span>
          <span className="font-mono text-[9px] text-[#a89e97]">kcal / serving</span>
        </div>

        <div className="bg-[#fcfaf8] p-2 border border-[#1a130e]/10 flex flex-col">
          <span className="font-mono text-[10px] uppercase text-[#7f756f]">
            Fat
          </span>
          <span className="font-syne text-base font-bold text-[#1a130e] mt-0.5">
            {perServingFat}g
          </span>
          <span className="font-mono text-[9px] text-[#a89e97]">from dairy / milk</span>
        </div>

        <div className="bg-[#fcfaf8] p-2 border border-[#1a130e]/10 flex flex-col">
          <span className="font-mono text-[10px] uppercase text-[#7f756f]">
            Protein
          </span>
          <span className="font-syne text-base font-bold text-[#1a130e] mt-0.5">
            {perServingProtein}g
          </span>
          <span className="font-mono text-[9px] text-[#a89e97]">milk solids</span>
        </div>
      </div>

      {/* Honest Footnote */}
      <p className="font-body text-[11px] text-[#7f756f] leading-tight">
        *Nutritional estimate based on standard package labels (whole milk &amp; sweetened condensed milk). Actual caffeine varies slightly by bean roast and extraction.
      </p>
    </div>
  );
}
