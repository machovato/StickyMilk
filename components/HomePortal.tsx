"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Coffee,
  Sparkle,
  Star,
  VideoCamera,
} from "@phosphor-icons/react";
import type { Recipe, Channel } from "@/lib/types";
import { CHANNEL_LABELS, FORMAT_LABELS } from "@/lib/types";
import { useChannel } from "@/lib/channel-context";
import { getRecipeImage } from "@/lib/recipe-images";

interface HomePortalProps {
  recipes: Recipe[];
}

export function HomePortal({ recipes }: HomePortalProps) {
  const { defaultChannel } = useChannel();
  const [translatorUrl, setTranslatorUrl] = useState("");

  // Hero Lead Drink is anchored on the Black Cat Affogato as the prime proof-of-life,
  // or adapts to the highest scored drink for an active channel.
  const heroRecipe = useMemo(() => {
    const affogato = recipes.find((r) => r.slug === "black-cat-affogato");
    if (affogato) return affogato;

    if (defaultChannel) {
      const candidates = [...recipes].filter((r) =>
        r.preparations.some((p) => p.channel === defaultChannel)
      );
      candidates.sort((a, b) => {
        const scoreA =
          a.review?.channel_scores?.[defaultChannel] ?? a.review?.score ?? 0;
        const scoreB =
          b.review?.channel_scores?.[defaultChannel] ?? b.review?.score ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.name.localeCompare(b.name);
      });
      return candidates[0] || recipes[0];
    }

    return recipes[0];
  }, [recipes, defaultChannel]);

  // Lead preparation for the hero drink
  const leadPrep = useMemo(() => {
    if (!heroRecipe) return null;
    if (defaultChannel) {
      return (
        heroRecipe.preparations.find((p) => p.channel === defaultChannel) ||
        heroRecipe.preparations[0]
      );
    }
    return (
      heroRecipe.preparations.find((p) => p.provenance === "original") ||
      heroRecipe.preparations[0]
    );
  }, [heroRecipe, defaultChannel]);

  const heroImage = heroRecipe ? getRecipeImage(heroRecipe.slug) : null;

  // Hero review data
  const heroScore =
    (defaultChannel && heroRecipe?.review?.channel_scores?.[defaultChannel]) ??
    heroRecipe?.review?.score ??
    9.4;
  const heroVerdict =
    (defaultChannel &&
      heroRecipe?.review?.channel_verdicts?.[defaultChannel]) ||
    heroRecipe?.review?.verdict ||
    heroRecipe?.flavor_notes;

  // 3 Curated Counter Flight Cards with clear flavor range & creator spotlight:
  // 1. Creator Hit (e.g. Cookie Butter Cloud Latte by @CoffeeGal2008)
  // 2. Cult Classic / House Benchmark (e.g. Cà Phê Sữa Đá by Nguyen Coffee Supply)
  // 3. Clean Everyday Morning Baseline (e.g. Classic Iced Latte, zero sugar)
  const flightRecipes = useMemo(() => {
    const available = recipes.filter((r) => r.slug !== heroRecipe?.slug);
    const compatible = available.filter((r) => {
      if (!defaultChannel) return true;
      return r.preparations.some((p) => p.channel === defaultChannel);
    });

    const creatorHit =
      compatible.find((r) => r.source?.type === "creator" && r.review != null) ||
      compatible.find((r) => r.slug === "cookie-butter-cloud-latte") ||
      compatible[0];

    const houseClassic =
      compatible.find(
        (r) =>
          r.slug !== creatorHit?.slug &&
          (r.slug === "ca-phe-sua-da" || r.slug === "salted-caramel-iced-latte")
      ) ||
      compatible.find((r) => r.slug !== creatorHit?.slug && r.review != null) ||
      compatible[1];

    const everyday =
      compatible.find(
        (r) =>
          r.slug !== creatorHit?.slug &&
          r.slug !== houseClassic?.slug &&
          (r.slug === "classic-iced-latte" || r.slug === "vanilla-oat-latte" || r.sweetness_level === "none")
      ) ||
      compatible.find(
        (r) => r.slug !== creatorHit?.slug && r.slug !== houseClassic?.slug
      );

    const list = [creatorHit, houseClassic, everyday].filter(
      (r): r is Recipe => Boolean(r)
    );

    if (list.length < 3) {
      for (const r of compatible) {
        if (!list.some((item) => item.slug === r.slug)) {
          list.push(r);
          if (list.length === 3) break;
        }
      }
    }

    return list.slice(0, 3);
  }, [recipes, heroRecipe?.slug, defaultChannel]);

  const communityTranslations = useMemo(() => {
    return recipes.filter(
      (r) =>
        r.status === "needs_testing" ||
        (r.source?.type === "creator" && !r.review)
    );
  }, [recipes]);

  const handleTranslatorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = translatorUrl.trim()
      ? `/translate?url=${encodeURIComponent(translatorUrl.trim())}`
      : `/translate`;
    window.location.href = target;
  };

  const getCtaLabel = (channel: Channel | null) => {
    switch (channel) {
      case "cometeer":
        return "MAKE THIS WITH COMETEER";
      case "nespresso":
        return "MAKE THIS WITH VERTUO";
      case "instant":
        return "MAKE THIS WITH INSTANT";
      default:
        return "BREW THIS RECIPE";
    }
  };

  const getCardCtaLabel = (channel: Channel | null) => {
    switch (channel) {
      case "cometeer":
        return "MAKE WITH COMETEER →";
      case "nespresso":
        return "MAKE WITH VERTUO →";
      case "instant":
        return "MAKE WITH INSTANT →";
      default:
        return "VIEW RECIPE →";
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-10 sm:gap-14 text-left">
      {/* =========================================================================
          UNIFIED ABOVE-THE-FOLD HERO: The Promise + The Affogato Obsession
          ========================================================================= */}
      <section className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        {/* Left Column: The Narrative & Core Proposition (~57% width) */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6 py-1">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-[#b8f600] border border-[#1a130e]/30 inline-block" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#001ec0]">
                MULTI-CHANNEL COFFEE DIRECTORY
              </span>
            </div>

            <h1 className="font-syne text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1a130e] tracking-tight leading-[1.08]">
              You saw a coffee drink you want.
              <br />
              <span className="text-[#001ec0]">
                StickyMilk shows you how to make it with the coffee you have.
              </span>
            </h1>

            <p className="font-mono text-xs sm:text-sm text-[#7f756f] uppercase tracking-wider font-semibold">
              COMETEER · NESPRESSO VERTUO · SPECIALTY INSTANT
            </p>

            {/* Editorial Transition into the Affogato */}
            <p className="font-body text-sm sm:text-base text-[#4d4540] leading-relaxed max-w-xl">
              We test trending drinks on real home machines, expose the hidden sugar,
              and give you the exact steps. Like turning an espresso-bar affogato into a
              two-minute kitchen win with whatever coffee is sitting on your counter.
            </p>
          </div>

          {/* App Lever Status & Trust Line */}
          <div className="flex flex-col gap-3 pt-3 border-t border-[#1a130e]/15">
            <div className="flex items-center gap-2 font-mono text-xs text-[#1a130e]">
              <span className="w-2 h-2 bg-[#001ec0] inline-block" />
              <span>
                {defaultChannel ? (
                  <>
                    Active Setting: <strong>{CHANNEL_LABELS[defaultChannel].toUpperCase()}</strong>.
                    Every recipe below is formatted for your machine.
                  </>
                ) : (
                  <>
                    Use <strong>MY COFFEE</strong> in the top header to adapt any drink in one click.
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap font-mono text-[11px] text-[#7f756f] font-semibold uppercase">
              <span className="px-2 py-0.5 bg-[#ede7e3] text-[#1a130e]">
                22 TESTED RECIPES
              </span>
              <span>·</span>
              <span className="px-2 py-0.5 bg-[#ede7e3] text-[#1a130e]">
                10-POINT TASTE REVIEWS
              </span>
              <span>·</span>
              <span className="px-2 py-0.5 bg-[#ede7e3] text-[#1a130e]">
                HONEST NUTRITION
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: The Lead Proof (Black Cat Affogato) (~43% width) */}
        {heroRecipe && (
          <div className="lg:col-span-5 bg-[#1a130e] text-white border-2 border-black shadow-xl overflow-hidden flex flex-col justify-between">
            {/* Lead Image & HUD */}
            <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#221a15]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroRecipe.image || heroImage?.imageUrl}
                alt={heroImage?.imageAlt || heroRecipe.name}
                className="w-full h-full object-cover"
              />

              {/* Top Score Pill & Format */}
              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                <span className="px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest bg-[#b8f600] text-[#141f00]">
                  {FORMAT_LABELS[heroRecipe.format]}
                </span>
                <span className="px-2 py-0.5 font-mono text-xs font-extrabold bg-[#1a130e] text-[#b8f600] border border-white/20 flex items-center gap-1 shadow-sm">
                  <Star size={13} weight="fill" className="text-[#b8f600]" />
                  <span>{heroScore.toFixed(1)} / 10</span>
                </span>
              </div>

              {/* Bottom Image HUD */}
              <div className="absolute bottom-2 left-2.5 right-2.5 bg-[#1a130e]/90 backdrop-blur-xs px-2.5 py-1 border border-white/10 flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#b8f600] font-bold uppercase">
                  CURRENT OBSESSION
                </span>
                <span className="text-[#d1c4bd]">
                  {leadPrep?.prep_time_minutes ?? 3}:00 MIN PREP
                </span>
              </div>
            </div>

            {/* Drink Content & Verdict */}
            <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 gap-4">
              <div className="flex flex-col gap-3">
                <div>
                  <h2 className="font-syne text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    {heroRecipe.name}
                  </h2>
                  {heroRecipe.source?.name && (
                    <div className="font-mono text-xs text-[#a89e97] mt-1 flex items-center gap-1.5">
                      <span>Origin: {heroRecipe.source.name}</span>
                      {heroRecipe.source.url && (
                        <a
                          href={heroRecipe.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#b8f600] hover:underline"
                        >
                          [Original ↗]
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* StickyMilk's Unvarnished Verdict Quote */}
                <div className="bg-[#221a15] p-3.5 border border-white/15 flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#b8f600]">
                    STICKYMILK&apos;S TAKE:
                  </span>
                  <blockquote className="font-body text-xs sm:text-sm text-[#f5eee9] italic border-l-2 border-[#b8f600] pl-2.5 leading-relaxed">
                    &ldquo;{heroVerdict}&rdquo;
                  </blockquote>
                </div>
              </div>

              {/* Hardware CTA */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                <Link
                  href={`/recipes/${heroRecipe.slug}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#b8f600] hover:bg-white text-[#141f00] px-4 py-3 font-mono text-xs font-extrabold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                >
                  <span>{getCtaLabel(defaultChannel)}</span>
                  <ArrowRight size={16} weight="bold" />
                </Link>

                <Link
                  href={`/recipes/${heroRecipe.slug}`}
                  className="px-3.5 py-3 bg-[#221a15] hover:bg-[#2c221c] text-[#d1c4bd] hover:text-white border border-white/15 font-mono text-xs uppercase tracking-wider text-center transition-colors cursor-pointer"
                >
                  Recipe Steps
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          BLOCK 2: The Translator CTA Strip (Visceral Outcome-First Language)
          ========================================================================= */}
      <section className="bg-[#001ec0] text-white p-6 sm:p-8 border-2 border-black shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#b8f600] text-[#141f00] font-mono text-[10px] font-extrabold uppercase tracking-widest">
                SAW A DRINK ON TIKTOK OR INSTAGRAM?
              </span>
            </div>

            <h2 className="font-syne text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              SAW A DRINK YOU WANT? MAKE IT WITH YOUR COFFEE.
            </h2>

            <p className="font-body text-sm sm:text-base text-[#dfe0ff] leading-relaxed">
              Paste a public TikTok, Reel, or video link. StickyMilk pulls out the ingredients,
              checks calories and caffeine, and builds a step-by-step recipe for Cometeer, Vertuo, or Instant.
            </p>
          </div>

          {/* Interactive URL Input & CTA Button */}
          <div className="flex flex-col gap-2 w-full lg:w-auto flex-shrink-0">
            <form
              onSubmit={handleTranslatorSubmit}
              className="flex flex-col sm:flex-row items-stretch gap-2.5"
            >
              <input
                type="url"
                value={translatorUrl}
                onChange={(e) => setTranslatorUrl(e.target.value)}
                placeholder="Paste TikTok or Instagram Reel URL..."
                className="px-4 py-3 bg-white text-[#1a130e] placeholder-[#7f756f] font-mono text-xs sm:text-sm border-2 border-black w-full sm:w-80 lg:w-96 focus:outline-none shadow-inner"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#1a130e] hover:bg-white hover:text-[#1a130e] text-[#b8f600] font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider border-2 border-black transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
              >
                <span>BUILD MY RECIPE</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            </form>
            <span className="font-mono text-[11px] text-[#dfe0ff]/80">
              Source credited. Ingredients, quantities, and nutrition estimates clearly marked.
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          BLOCK 3: The Counter Flight (3 Breathing Cards with Range & Pull-Quotes)
          ========================================================================= */}
      <section className="flex flex-col gap-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#1a130e] pb-2">
          <div>
            <h3 className="font-syne text-xl sm:text-2xl font-bold uppercase text-[#1a130e] tracking-tight">
              {defaultChannel
                ? `ON THE COUNTER // TOP ${CHANNEL_LABELS[defaultChannel].toUpperCase()} FLIGHT`
                : "ON THE COUNTER // TEST KITCHEN FAVORITES"}
            </h3>
            <p className="font-body text-xs sm:text-sm text-[#7f756f]">
              {defaultChannel
                ? `3 curated drinks tested and calibrated specifically for ${CHANNEL_LABELS[defaultChannel]}.`
                : "3 high-conviction recipes spanning viral creator hits, house benchmarks, and clean morning baselines."}
            </p>
          </div>
        </div>

        {/* 3 Breathing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {flightRecipes.map((recipe) => {
            const prep = defaultChannel
              ? recipe.preparations.find((p) => p.channel === defaultChannel)
              : recipe.preparations.find((p) => p.provenance === "original") ||
                recipe.preparations[0];
            const img = getRecipeImage(recipe.slug);
            const score =
              (defaultChannel && recipe.review?.channel_scores?.[defaultChannel]) ??
              recipe.review?.score ??
              null;
            const verdict =
              (defaultChannel && recipe.review?.channel_verdicts?.[defaultChannel]) ||
              recipe.review?.verdict;

            return (
              <div
                key={recipe.slug}
                className="group flex flex-col bg-white border-2 border-[#1a130e]/20 hover:border-[#1a130e] shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden text-left"
              >
                {/* Image Banner */}
                <Link
                  href={`/recipes/${recipe.slug}`}
                  className="relative w-full aspect-video sm:aspect-[4/3] overflow-hidden bg-[#221a15] block cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={recipe.image || img.imageUrl}
                    alt={img.imageAlt || recipe.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Top HUD */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10">
                    <span className="px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider bg-[#1a130e] text-white">
                      {FORMAT_LABELS[recipe.format]}
                    </span>

                    {score != null && (
                      <span className="px-2 py-0.5 font-mono text-[11px] font-extrabold bg-[#1a130e] text-[#b8f600] border border-white/20 flex items-center gap-1 shadow-xs">
                        <Star size={13} weight="fill" className="text-[#b8f600]" />
                        <span>{score.toFixed(1)}</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom Creator Pill */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-mono bg-[#1a130e]/90 text-white px-2 py-1 backdrop-blur-xs border border-white/10">
                    <span className="text-[#b8f600] font-bold uppercase truncate max-w-[70%]">
                      {recipe.source?.handle
                        ? `FROM ${recipe.source.handle.toUpperCase()}`
                        : recipe.source?.name
                        ? `FROM ${recipe.source.name.toUpperCase()}`
                        : "STICKYMILK ORIGINAL"}
                    </span>
                    <span className="text-[#d1c4bd]">
                      {prep?.prep_time_minutes ?? 5} MIN
                    </span>
                  </div>
                </Link>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/recipes/${recipe.slug}`}
                      className="hover:text-[#001ec0] transition-colors"
                    >
                      <h4 className="font-syne text-xl font-bold text-[#1a130e] tracking-tight leading-snug">
                        {recipe.name}
                      </h4>
                    </Link>

                    {/* Tony's Unvarnished Verdict Quote */}
                    {verdict && (
                      <blockquote className="font-body text-xs text-[#4d4540] italic border-l-2 border-[#b8f600] pl-2.5 my-1 leading-relaxed">
                        &ldquo;{verdict}&rdquo;
                      </blockquote>
                    )}
                  </div>

                  {/* Hardware Action Button */}
                  <Link
                    href={`/recipes/${recipe.slug}`}
                    className="mt-2 w-full py-2.5 bg-[#1a130e] hover:bg-[#001ec0] text-[#b8f600] hover:text-white font-mono text-xs font-bold uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>{getCardCtaLabel(defaultChannel)}</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* =========================================================================
            BLOCK 4: Fresh Social Translations // The Community Feed
            ========================================================================= */}
        {communityTranslations.length > 0 && (
          <div className="flex flex-col gap-6 mt-6 pt-6 border-t-2 border-[#1a130e]/15">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#1a130e] pb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#ff9800] text-black font-mono text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                    <Clock size={12} weight="bold" />
                    <span>COMMUNITY LAB QUEUE</span>
                  </span>
                  <span className="font-mono text-xs text-[#7f756f]">
                    AWAITING TEST KITCHEN RATING
                  </span>
                </div>
                <h3 className="font-syne text-xl sm:text-2xl font-bold uppercase text-[#1a130e] tracking-tight mt-1">
                  Fresh Social Media Translations
                </h3>
                <p className="font-body text-xs sm:text-sm text-[#7f756f]">
                  Drinks imported from viral reels by the community, with step-by-step hardware brew math generated by StickyMilk.
                </p>
              </div>

              <Link
                href="/translate"
                className="text-[#001ec0] hover:text-[#1a130e] font-mono text-xs font-bold uppercase flex items-center gap-1 self-start sm:self-auto"
              >
                <span>+ Translate Another Reel</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {communityTranslations.slice(0, 3).map((recipe) => {
                const prep = defaultChannel
                  ? recipe.preparations.find((p) => p.channel === defaultChannel) || recipe.preparations[0]
                  : recipe.preparations[0];
                const img = getRecipeImage(recipe.slug);

                return (
                  <div
                    key={recipe.slug}
                    className="group flex flex-col bg-white border-2 border-[#ff9800]/40 hover:border-[#1a130e] shadow-xs hover:shadow-xl transition-all duration-200 overflow-hidden text-left"
                  >
                    <Link
                      href={`/recipes/${recipe.slug}`}
                      className="relative w-full aspect-video sm:aspect-[4/3] overflow-hidden bg-[#221a15] block cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={recipe.image || img.imageUrl}
                        alt={img.imageAlt || recipe.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* Top HUD */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1 z-10">
                        <span className="px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider bg-[#1a130e] text-white">
                          {FORMAT_LABELS[recipe.format]}
                        </span>

                        <span className="px-2 py-0.5 font-mono text-[10px] font-extrabold bg-[#ff9800] text-black flex items-center gap-1 shadow-xs">
                          <Clock size={12} weight="bold" />
                          <span>NEEDS TESTING</span>
                        </span>
                      </div>

                      {/* Bottom Creator Pill */}
                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-mono bg-[#1a130e]/90 text-white px-2 py-1 backdrop-blur-xs border border-white/10">
                        <span className="text-[#b8f600] font-bold uppercase truncate max-w-[70%]">
                          {recipe.source?.handle
                            ? `FROM ${recipe.source.handle.toUpperCase()}`
                            : recipe.source?.name
                            ? `FROM ${recipe.source.name.toUpperCase()}`
                            : "COMMUNITY SEED"}
                        </span>
                        <span className="text-[#d1c4bd]">
                          {prep?.prep_time_minutes ?? 4} MIN
                        </span>
                      </div>
                    </Link>

                    <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/recipes/${recipe.slug}`}
                          className="hover:text-[#001ec0] transition-colors"
                        >
                          <h4 className="font-syne text-xl font-bold text-[#1a130e] tracking-tight leading-snug">
                            {recipe.name}
                          </h4>
                        </Link>

                        <p className="font-body text-xs text-[#7f756f] line-clamp-2">
                          {recipe.flavor_notes}
                        </p>
                      </div>

                      <Link
                        href={`/recipes/${recipe.slug}`}
                        className="mt-2 w-full py-2.5 bg-[#1a130e] hover:bg-[#001ec0] text-[#b8f600] hover:text-white font-mono text-xs font-bold uppercase tracking-wider text-center transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>VIEW TRANSLATED SPEC →</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Complete Vault Handoff Callout Banner */}
        <div className="mt-4 bg-[#f3ede9] border-2 border-[#1a130e] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="flex flex-col gap-1.5 max-w-2xl">
            <span className="font-mono text-xs font-bold uppercase text-[#001ec0] tracking-wider">
              LOOKING FOR SOMETHING SPECIFIC?
            </span>
            <h4 className="font-syne text-xl sm:text-2xl font-bold text-[#1a130e] tracking-tight">
              Explore the Complete Recipe Vault
            </h4>
            <p className="font-body text-xs sm:text-sm text-[#4d4540] leading-relaxed">
              Search all {recipes.length} multi-channel drinks with instant full-text search,
              sweetness filters, roast tags, creator archives, and custom ratio calculators.
            </p>
          </div>

          <Link
            href="/recipes"
            className="px-6 py-3.5 bg-[#1a130e] hover:bg-[#001ec0] text-white font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-colors border-2 border-black flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer shadow-sm"
          >
            <span>BROWSE ALL {recipes.length} RECIPES</span>
            <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
      </section>
    </div>
  );
}
