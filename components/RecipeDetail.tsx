"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Scales, Sparkle } from "@phosphor-icons/react";
import type { Channel, Recipe } from "@/lib/types";
import {
  DIETARY_LABELS,
  FORMAT_LABELS,
  SWEETNESS_LABELS,
  CHANNEL_LABELS,
} from "@/lib/types";
import { useChannel } from "@/lib/channel-context";
import { getRecipeImage } from "@/lib/recipe-images";
import { StatusBadge } from "./StatusBadge";
import { ProvenanceBadge } from "./ProvenanceBadge";
import { SourceAttribution } from "./SourceAttribution";
import { BaristaDiff } from "./BaristaDiff";
import { IngredientChecklist } from "./IngredientChecklist";
import { PreparationSteps } from "./PreparationSteps";
import { EmptyPreparationState } from "./EmptyPreparationState";
import { BuildYourBar } from "./BuildYourBar";
import { NutritionBreakdown } from "./NutritionBreakdown";
import { RecipeVariations } from "./RecipeVariations";
import { formatAmount } from "@/lib/format-amount";

const SCALE_OPTIONS = [1, 2, 4];

export function RecipeDetail({
  recipe,
  isAdmin = false,
}: {
  recipe: Recipe;
  isAdmin?: boolean;
}) {
  const { defaultChannel, setDefaultChannel } = useChannel();
  const [activeChannelOverride, setActiveChannelOverride] = useState<Channel | null>(null);

  const originalPrepChannel =
    recipe.preparations.find((p) => p.provenance === "original")?.channel ||
    recipe.preparations[0]?.channel ||
    "cometeer";

  const channel: Channel =
    activeChannelOverride || defaultChannel || originalPrepChannel;

  const [scale, setScale] = useState(1);
  const [copied, setCopied] = useState(false);

  const prep = recipe.preparations.find((p) => p.channel === channel);
  const image = getRecipeImage(recipe.slug);

  // Format badge variant
  const getBadgeClass = (format: string) => {
    switch (format) {
      case "iced":
      case "mocktail":
        return "bg-[#b8f600] text-[#141f00] font-bold";
      case "cocktail":
      case "baking":
        return "bg-[#001ec0] text-white font-bold";
      case "hot":
      case "affogato":
      default:
        return "bg-[#1a130e] text-white font-bold";
    }
  };

  const roastLabel = prep?.roast_recommendation
    ? `${prep.roast_recommendation.toUpperCase()} ROAST`
    : "ANY ROAST";

  const caffeineLabel = prep?.caffeine_level
    ? `${prep.caffeine_level.toUpperCase()} CAFFEINE`
    : "CAFFEINE";

  // Share formula to clipboard
  const handleCopyFormula = () => {
    if (!prep) return;
    const ingredientsText = prep.ingredients
      .map((ing) => {
        const amt = ing.amount != null ? `${ing.amount * scale} ${ing.unit ?? ""}`.trim() : "";
        return `• ${amt ? amt + " " : ""}${ing.item}`;
      })
      .join("\n");

    const text = `STICKYMILK RECIPE // ${recipe.name.toUpperCase()}\nChannel: ${CHANNEL_LABELS[channel]}\nSweetness: ${SWEETNESS_LABELS[recipe.sweetness_level]}\nBatch: ${scale}x (${formatAmount(prep.servings * scale)} servings)\n\nINGREDIENTS:\n${ingredientsText}\n\nSTEPS:\n${prep.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find primary sweetener or flavor component for the quick metric card
  const primarySweetener = prep?.ingredients.find(
    (ing) =>
      ing.item_id === "sweetened_condensed_milk" ||
      ing.item.toLowerCase().includes("condensed") ||
      ing.item.toLowerCase().includes("syrup") ||
      ing.item.toLowerCase().includes("sugar") ||
      ing.item.toLowerCase().includes("butter")
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8 text-left">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white border border-[#1a130e]/15 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/"
            className="flex items-center gap-1 font-mono text-xs uppercase font-bold text-[#001ec0] hover:text-[#1a130e] transition-colors"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Back to Recipes</span>
          </Link>
          <span className="text-[#d1c4bd]">|</span>
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#b8f600] text-[#141f00] uppercase">
            RECIPE SPEC
          </span>
          <span className="font-mono text-xs text-[#7f756f]">
            ID: {recipe.slug.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {isAdmin && (
            <Link
              href={`/recipes/${recipe.slug}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#b8f600] hover:bg-[#001ec0] hover:text-white text-[#141f00] font-mono text-xs uppercase font-bold transition-colors cursor-pointer border border-[#1a130e]/20"
            >
              <span>Edit Recipe ✎</span>
            </Link>
          )}
          <StatusBadge status={recipe.status} />
          <button
            type="button"
            onClick={handleCopyFormula}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a130e] hover:bg-[#001ec0] text-white font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
          >
            {copied ? (
              <Check size={16} weight="bold" />
            ) : (
              <Copy size={16} weight="bold" />
            )}
            <span>{copied ? "Copied" : "Share Recipe"}</span>
          </button>
        </div>
      </div>

      {/* Main Hero Visual & Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Studio Photography with HUD */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="relative w-full aspect-square bg-[#221a15] overflow-hidden border border-[#1a130e]/15 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element -- Studio photography mapped from Stitch prototype */}
            <img
              src={recipe.image || image.imageUrl}
              alt={image.imageAlt || recipe.name}
              className="w-full h-full object-cover"
            />
            {/* Top format badge */}
            <div className="absolute top-3 left-3 z-10">
              <span
                className={`px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-wider ${getBadgeClass(
                  recipe.format
                )}`}
              >
                {FORMAT_LABELS[recipe.format]}
              </span>
            </div>

            {/* Bottom HUD overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-[#1a130e]/95 text-white px-3 py-2 border border-white/10 backdrop-blur-sm z-10">
              <span className="font-mono text-xs text-[#b8f600] font-bold">
                {SWEETNESS_LABELS[recipe.sweetness_level].toUpperCase()}
              </span>
              <span className="font-mono text-xs text-[#d1c4bd]">
                {prep ? `EST: ${prep.prep_time_minutes}:00 MIN` : "READY"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Drink Specs & Heritage */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-xs uppercase text-[#001ec0] font-bold">
              {`${roastLabel} // ${caffeineLabel}`}
            </span>
            <h1 className="font-syne text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1a130e] tracking-tight leading-[1.1]">
              {recipe.name}
            </h1>
          </div>

          <p className="font-body text-base sm:text-lg leading-relaxed text-[#4d4540]">
            {recipe.flavor_notes}
          </p>

          {/* Flavor note / collection chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {recipe.tags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="font-mono text-xs bg-[#f3ede9] hover:bg-[#1a130e] hover:text-white px-2.5 py-1 text-[#1d1b19] font-medium transition-colors cursor-pointer"
                title={`View all ${tag.replace(/-/g, " ")} recipes`}
              >
                #{tag.replace(/-/g, " ")}
              </Link>
            ))}
          </div>

          {/* Source Attribution (Vendor vs Creator vs Editorial) */}
          {recipe.source && (
            <SourceAttribution source={recipe.source} variant="detail" />
          )}

          {/* Barista Tip if provided */}
          {recipe.barista_note && (
            <div className="p-4 bg-[#f8f2ee] border-l-4 border-[#001ec0] flex flex-col gap-1 text-xs">
              <strong className="font-mono text-[#001ec0] uppercase tracking-wider font-bold">
                BARISTA TIP:
              </strong>
              <p className="font-body text-xs sm:text-sm text-[#4d4540] leading-relaxed">
                {recipe.barista_note}
              </p>
            </div>
          )}

          {/* Data flagged issues if any */}
          {recipe.data_issues && recipe.data_issues.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-mono">
              <p className="font-bold uppercase">Data flagged for review:</p>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                {recipe.data_issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>

      {/* Hardware System Switcher:
          - When global MY COFFEE is blank (null): show full hardware tabs so visitor can freely explore all formulations (defaults to ORIGINAL).
          - When global MY COFFEE is selected: respect user's machine choice without dual-selector conflict, but provide an optional 1-click peek at the original recipe.
      */}
      {!defaultChannel ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1a130e] text-white p-3 sm:p-4 border border-black shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#b8f600]" />
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#b8f600]">
              EXPLORE HARDWARE FORMULATION:
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["cometeer", "nespresso", "instant"] as Channel[]).map((c) => {
              const hasPrep = recipe.preparations.some((p) => p.channel === c);
              const isSelected = channel === c;
              const p = recipe.preparations.find((p) => p.channel === c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveChannelOverride(c)}
                  disabled={!hasPrep}
                  className={`flex items-center gap-2 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-tight transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-[#b8f600] text-[#1a130e] border-[#b8f600] shadow-sm"
                      : hasPrep
                      ? "bg-[#2a211a] text-white border-white/20 hover:border-white/50"
                      : "bg-[#1a130e] text-white/40 border-white/10 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <span>{CHANNEL_LABELS[c]}</span>
                  {p?.provenance === "original" && (
                    <span
                      className={`text-[9px] px-1 py-0.2 font-mono uppercase font-bold ${
                        isSelected
                          ? "bg-[#1a130e] text-[#b8f600]"
                          : "bg-[#b8f600] text-[#1a130e]"
                      }`}
                    >
                      ORIGINAL
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-[#f8f2ee] border border-[#1a130e]/15 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#b8f600] border border-[#1a130e]" />
            <span className="text-[#1a130e] font-bold uppercase">
              VIEWING FOR {CHANNEL_LABELS[channel].toUpperCase()}
            </span>
            <span className="text-[#7f756f]">
              ({prep?.provenance === "original" ? "ORIGINAL FORMULATION" : "SM HARDWARE TRANSLATION"})
            </span>
          </div>

          {originalPrepChannel !== defaultChannel && (
            <button
              type="button"
              onClick={() =>
                setActiveChannelOverride(
                  channel === originalPrepChannel ? null : originalPrepChannel
                )
              }
              className="text-[#001ec0] hover:text-[#1a130e] underline underline-offset-2 font-bold cursor-pointer transition-colors"
            >
              {channel === originalPrepChannel
                ? `Back to My Coffee (${CHANNEL_LABELS[defaultChannel]})`
                : `Peek at Original ${CHANNEL_LABELS[originalPrepChannel]} Recipe ↗`}
            </button>
          )}
        </div>
      )}

      {prep ? (
        <>
          {/* Serving Scaler Band */}
          <div className="bg-[#f8f2ee] p-5 sm:p-6 border border-[#1a130e]/15 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1a130e]/10 pb-3">
              <div className="flex items-center gap-2">
                <Scales size={20} weight="bold" className="text-[#001ec0]" />
                <span className="font-syne text-base font-bold uppercase text-[#1a130e]">
                  Serving Scaler
                </span>
              </div>

              {/* Batch Scale Buttons */}
              <div className="flex items-center gap-1 bg-white p-1 border border-[#1a130e]/15">
                <span className="font-mono text-xs px-2 text-[#7f756f]">
                  BATCH:
                </span>
                {SCALE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setScale(opt)}
                    className={`px-3 py-1 font-mono text-xs font-bold transition-colors cursor-pointer ${
                      scale === opt
                        ? "bg-[#1a130e] text-white"
                        : "text-[#1a130e] hover:bg-[#ede7e3]"
                    }`}
                  >
                    {opt}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scaler Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3 border border-[#1a130e]/10 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] text-[#7f756f] uppercase">
                    Extraction Channel
                  </span>
                  <ProvenanceBadge provenance={prep.provenance ?? (recipe.source?.type === "vendor" ? "original" : "adapted")} size="xs" />
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-syne text-xl font-bold text-[#1a130e]">
                    {CHANNEL_LABELS[channel]}
                  </span>
                  {prep.nespresso_system && (
                    <span className="font-mono text-[10px] uppercase font-bold text-[#001ec0] bg-[#dfe0ff] px-1.5 py-0.5">
                      {prep.nespresso_system}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-[#001ec0] mt-0.5">
                  {prep.difficulty.toUpperCase()} DIFFICULTY
                </span>
              </div>

              <div className="bg-white p-3 border border-[#1a130e]/10 flex flex-col justify-between">
                <span className="font-mono text-[11px] text-[#7f756f] uppercase">
                  Sweetness Profile
                </span>
                <span className="font-syne text-xl font-bold text-[#1a130e] mt-1">
                  {SWEETNESS_LABELS[recipe.sweetness_level]}
                </span>
                <span className="font-mono text-[10px] text-[#7f756f] mt-0.5 truncate">
                  {primarySweetener?.amount != null
                    ? `${formatAmount(primarySweetener.amount * scale)} ${primarySweetener.unit ?? ""} ${primarySweetener.item}`.trim()
                    : "Unsweetened base"}
                </span>
              </div>

              <div className="bg-white p-3 border border-[#1a130e]/10 flex flex-col">
                <span className="font-mono text-[11px] text-[#7f756f] uppercase">
                  Batch Yield
                </span>
                <span className="font-syne text-xl font-bold text-[#1a130e] mt-1">
                  {formatAmount(prep.servings * scale)}{" "}
                  {prep.yield_unit ??
                    (prep.servings * scale === 1 ? "serving" : "servings")}
                </span>
                <span className="font-mono text-[10px] text-[#7f756f] mt-0.5">
                  {prep.prep_time_minutes} min prep
                </span>
              </div>

              <div className="bg-white p-3 border border-[#1a130e]/10 flex flex-col">
                <span className="font-mono text-[11px] text-[#7f756f] uppercase">
                  Caffeine Potency
                </span>
                <span className="font-syne text-xl font-bold text-[#1a130e] mt-1">
                  {prep.caffeine_mg != null
                    ? `~${Math.round(prep.caffeine_mg * scale)} mg`
                    : prep.caffeine_level.toUpperCase()}
                </span>
                <span className="font-mono text-[10px] text-[#b8f600] bg-[#1a130e] px-1 inline-block mt-0.5 w-fit">
                  {roastLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Kitchen Execution: Ingredients, Steps, Chronometer & Physics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Side: Ingredients & Step-by-Step Procedure */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white p-6 border border-[#1a130e]/15 shadow-sm">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1a130e]/10">
                  <span className="w-2.5 h-2.5 bg-[#001ec0]" />
                  <h2 className="font-syne text-lg font-bold uppercase text-[#1a130e]">
                    Scaled Ingredients
                  </h2>
                </div>
                <IngredientChecklist
                  key={channel}
                  ingredients={prep.ingredients}
                  scale={scale}
                />
              </div>

              <div className="bg-white p-6 border border-[#1a130e]/15 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1a130e]/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-[#001ec0]" />
                    <h2 className="font-syne text-lg font-bold uppercase text-[#1a130e]">
                      Step-by-Step Procedure
                    </h2>
                  </div>
                  <span className="font-mono text-xs text-[#7f756f]">
                    {prep.steps.length} STAGES
                  </span>
                </div>
                <PreparationSteps steps={prep.steps} />
              </div>
            </div>

            {/* Right Side: Barista Note & Craft Provenance */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Barista Note (Rendered only when a real note exists) */}
              {(prep.barista_note || recipe.barista_note) && (
                <div className="bg-[#1a130e] text-white p-5 border border-[#1a130e] shadow-md flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-mono text-[11px] font-bold text-[#b8f600] uppercase tracking-wider">
                      BARISTA NOTE
                    </span>
                    <Sparkle size={18} weight="bold" className="text-[#b8f600]" />
                  </div>
                  <p className="font-body text-xs sm:text-sm text-[#fef8f4] leading-relaxed">
                    {prep.barista_note || recipe.barista_note}
                  </p>
                </div>
              )}

              {/* Craft Provenance & Sensory Specs */}
              <div className="bg-white p-5 border border-[#1a130e]/15 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-[#1a130e]/10 pb-2">
                  <span className="font-mono text-[11px] font-bold uppercase text-[#1a130e] tracking-wider">
                    CRAFT PROVENANCE
                  </span>
                  <ProvenanceBadge provenance={prep.provenance ?? (recipe.source?.type === "vendor" ? "original" : "adapted")} size="sm" />
                </div>

                {prep.nespresso_system && (
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-mono text-[11px] uppercase text-[#7f756f]">
                      Hardware Profile:
                    </span>
                    <span className="font-mono font-bold text-[#1a130e] uppercase">
                      Nespresso {prep.nespresso_system === "vertuo" ? "Vertuo (Centrifusion)" : "Original Line (19-Bar)"}
                    </span>
                  </div>
                )}

                {prep.roast_recommendation && (
                  <div className="flex flex-col gap-1 text-xs">
                    <span className="font-mono text-[11px] uppercase text-[#7f756f]">
                      Roast Recommendation:
                    </span>
                    <span className="font-syne font-bold text-[#1a130e] capitalize">
                      {prep.roast_recommendation} Roast
                    </span>
                    {prep.roast_note && (
                      <p className="font-body text-[#4d4540] text-xs">
                        {prep.roast_note}
                      </p>
                    )}
                  </div>
                )}

                {prep.tested_with && (
                  <div className="flex flex-col gap-1 text-xs pt-1 border-t border-[#1a130e]/10">
                    <span className="font-mono text-[11px] uppercase text-[#7f756f]">
                      Tested With:
                    </span>
                    <span className="font-body font-medium text-[#1a130e]">
                      {prep.tested_with}
                    </span>
                  </div>
                )}

                {prep.capsule_count != null && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-[#1a130e]/10">
                    <span className="font-mono text-[11px] uppercase text-[#7f756f]">
                      Capsule Count:
                    </span>
                    <span className="font-mono font-bold text-[#1a130e]">
                      {Math.round(prep.capsule_count * scale)}
                    </span>
                  </div>
                )}

                {(prep.equipment?.length || prep.dietary?.length) ? (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#1a130e]/10">
                    {prep.equipment?.map((tool) => (
                      <span
                        key={tool}
                        className="font-mono text-[11px] bg-[#f3ede9] px-2 py-0.5 text-[#1a130e]"
                      >
                        🛠 {tool}
                      </span>
                    ))}
                    {prep.dietary?.map((tag) => (
                      <span
                        key={tag}
                        className="font-mono text-[11px] bg-[#dfe0ff] text-[#000a63] px-2 py-0.5 font-bold"
                      >
                        {DIETARY_LABELS[tag]}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Per-Serving Caffeine & Sugar Profile */}
              <NutritionBreakdown prep={prep} scale={scale} />

              {/* Try These Varieties: Alternate Creator Takes */}
              {recipe.variations && recipe.variations.length > 0 && (
                <RecipeVariations variations={recipe.variations} />
              )}
            </div>
          </div>

          {/* Method Translation Mechanics */}
          <BaristaDiff channel={channel} />

          {/* Build Your Bar Gear */}
          <BuildYourBar />
        </>
      ) : (
        <EmptyPreparationState
          recipe={recipe}
          channel={channel}
          onSwitch={setDefaultChannel}
        />
      )}
    </div>
  );
}
