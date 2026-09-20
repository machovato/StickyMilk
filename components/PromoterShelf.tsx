"use client";

import React, { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { CaretLeft, CaretRight, Sparkle, Star } from "@phosphor-icons/react";
import type { Recipe, Channel } from "@/lib/types";
import { CHANNEL_LABELS } from "@/lib/types";
import { useChannel } from "@/lib/channel-context";

interface PromoterShelfProps {
  recipes: Recipe[];
}

export function PromoterShelf({ recipes }: PromoterShelfProps) {
  const { defaultChannel } = useChannel();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter recipes for the promoter shelf:
  // Must be marked featured, or have an editorial review, or have a promoter_tag.
  // If a coffee channel is selected, ensure it has a preparation for that channel.
  const shelfRecipes = recipes.filter((r) => {
    const isFeatured = r.featured || r.review != null || r.promoter_tag != null;
    if (!isFeatured) return false;
    if (defaultChannel) {
      return r.preparations.some((p) => p.channel === defaultChannel);
    }
    return true;
  });

  // If none explicitly tagged yet, fallback to top verified drinks
  const displayRecipes =
    shelfRecipes.length > 0
      ? shelfRecipes
      : recipes.filter((r) => r.status === "verified").slice(0, 6);

  if (displayRecipes.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Header contextualized to the active coffee foundation
  const shelfTitle = defaultChannel
    ? `★ ON THE COUNTER // TOP PICKS FOR ${CHANNEL_LABELS[defaultChannel].toUpperCase()}`
    : "★ ON THE COUNTER // TRENDING & TEST KITCHEN PICKS";

  const shelfSubtitle = defaultChannel
    ? `Curated drinks, 10-point test kitchen reviews, and viral hits calibrated for your ${CHANNEL_LABELS[defaultChannel]} setup.`
    : "High-conviction recipes, viral creator takes, and test kitchen verdicts across all systems.";

  return (
    <section className="w-full mb-8 bg-[#1a130e] text-white p-5 sm:p-7 border border-[#1a130e] shadow-md">
      {/* Shelf Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#b8f600]" />
            <h2 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#b8f600]">
              {shelfTitle}
            </h2>
          </div>
          <p className="font-body text-xs sm:text-sm text-[#d1c4bd] mt-1">
            {shelfSubtitle}
          </p>
        </div>

        {/* Scroll Control Arrows */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="w-8 h-8 flex items-center justify-center bg-[#221a15] hover:bg-[#001ec0] text-white border border-white/15 transition-colors cursor-pointer"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="w-8 h-8 flex items-center justify-center bg-[#221a15] hover:bg-[#001ec0] text-white border border-white/15 transition-colors cursor-pointer"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </div>

      {/* Horizontal Netflix-Style Scroll Area */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-3 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-white/20"
        style={{ scrollbarWidth: "thin" }}
      >
        {displayRecipes.map((recipe) => {
          // Channel-specific preparation if coffee is selected, or fallback to first
          const prep = defaultChannel
            ? recipe.preparations.find((p) => p.channel === defaultChannel) ||
              recipe.preparations[0]
            : recipe.preparations[0];

          // Channel-specific 10-point score & verdict if available
          const channelScore =
            defaultChannel && recipe.review?.channel_scores?.[defaultChannel]
              ? recipe.review.channel_scores[defaultChannel]
              : recipe.review?.score;

          const channelVerdict =
            defaultChannel && recipe.review?.channel_verdicts?.[defaultChannel]
              ? recipe.review.channel_verdicts[defaultChannel]
              : recipe.review?.verdict;

          return (
            <Link
              key={recipe.slug}
              href={`/recipes/${recipe.slug}`}
              className="flex-shrink-0 w-[280px] sm:w-[320px] bg-[#221a15] border border-white/10 hover:border-[#b8f600] transition-all flex flex-col justify-between group snap-start"
            >
              {/* Card Header Tag */}
              <div className="p-3 border-b border-white/10 flex items-center justify-between text-[11px] font-mono font-bold">
                <span className="px-2 py-0.5 bg-[#b8f600] text-[#141f00] uppercase tracking-wider">
                  {recipe.promoter_tag || (recipe.review ? "SM TESTED" : "FEATURED")}
                </span>
                {channelScore != null && (
                  <span className="flex items-center gap-1 text-[#b8f600]">
                    <Star size={12} weight="fill" />
                    <span>{channelScore.toFixed(1)} / 10</span>
                  </span>
                )}
              </div>

              {/* Card Media Preview */}
              <div className="relative w-full h-36 bg-[#1a130e] overflow-hidden">
                {recipe.image ? (
                  <Image
                    src={recipe.image}
                    alt={recipe.name}
                    fill
                    sizes="(max-width: 640px) 280px, 320px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#2a201a] to-[#1a130e]">
                    <Sparkle size={28} className="text-[#b8f600] mb-2" />
                    <span className="font-mono text-xs uppercase tracking-widest text-[#d1c4bd]">
                      {recipe.format} Coffee Spec
                    </span>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                <div>
                  <h3 className="font-syne font-bold text-base text-white group-hover:text-[#b8f600] transition-colors line-clamp-1">
                    {recipe.name}
                  </h3>
                  {recipe.source && (
                    <p className="font-mono text-[11px] text-[#a89e97] mt-0.5 line-clamp-1">
                      By {recipe.source.name} {recipe.source.handle && `(${recipe.source.handle})`}
                    </p>
                  )}

                  {/* Test Kitchen Verdict Quote or Flavor Notes */}
                  <p className="font-body text-xs text-[#d1c4bd] mt-2 line-clamp-2 leading-relaxed italic">
                    {channelVerdict ? `"${channelVerdict}"` : recipe.flavor_notes}
                  </p>
                </div>

                {/* Channel-Specific Hardware Spec Footer */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono uppercase text-[#a89e97]">
                  {defaultChannel ? (
                    <>
                      <span className="text-[#b8f600] font-bold">
                        {CHANNEL_LABELS[defaultChannel]}
                      </span>
                      <span>{prep.prep_time_minutes} min prep</span>
                      <span>{prep.caffeine_level} caf</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[#d1c4bd]">3 Channels</span>
                      <span>{prep.prep_time_minutes} min prep</span>
                      <span className="text-[#b8f600] font-bold">100% Parity</span>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
