"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Coffee,
  Sparkle,
  Star,
} from "@phosphor-icons/react";
import type { Recipe, Channel } from "@/lib/types";
import { CHANNEL_LABELS, FORMAT_LABELS, SWEETNESS_LABELS } from "@/lib/types";
import { useChannel } from "@/lib/channel-context";
import { getRecipeImage } from "@/lib/recipe-images";
import { calculateNutrition } from "@/lib/nutrition";
import { BARISTA_DIFF } from "@/lib/barista-diff";
import { ProvenanceBadge } from "./ProvenanceBadge";

interface HomePortalProps {
  recipes: Recipe[];
}

const CHANNEL_OPTIONS: { id: Channel; label: string; desc: string }[] = [
  {
    id: "cometeer",
    label: "Cometeer",
    desc: "Frozen Liquid Extract",
  },
  {
    id: "nespresso",
    label: "Nespresso",
    desc: "Vertuo Espresso",
  },
  {
    id: "instant",
    label: "Instant",
    desc: "Specialty Soluble",
  },
];

export function HomePortal({ recipes }: HomePortalProps) {
  const { defaultChannel, setDefaultChannel } = useChannel();
  const [translatorUrl, setTranslatorUrl] = useState("");

  // Select the lead hero recipe based on the active hardware selection
  const heroRecipe = useMemo(() => {
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

    // Default overall: highest review score
    const withReview = [...recipes].filter((r) => r.review != null);
    withReview.sort((a, b) => (b.review?.score ?? 0) - (a.review?.score ?? 0));
    return withReview[0] || recipes[0];
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
  const heroNutrition = leadPrep ? calculateNutrition(leadPrep, 1) : null;

  // Hero review data
  const heroScore =
    (defaultChannel && heroRecipe?.review?.channel_scores?.[defaultChannel]) ??
    heroRecipe?.review?.score ??
    9.8;
  const heroVerdict =
    (defaultChannel &&
      heroRecipe?.review?.channel_verdicts?.[defaultChannel]) ||
    heroRecipe?.review?.verdict ||
    heroRecipe?.flavor_notes;

  // 3 Curated Counter Flight Cards with clear flavor range & creator spotlight
  // 1. Creator Hit (e.g. Cookie Butter Cloud Latte by @CoffeeGal2008)
  // 2. Savory / Indulgent Favorite (e.g. Salted Caramel Iced Latte or Black Cat Affogato)
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

    const houseFav =
      compatible.find(
        (r) =>
          r.slug !== creatorHit?.slug &&
          (r.slug === "salted-caramel-iced-latte" || r.slug === "black-cat-affogato")
      ) ||
      compatible.find((r) => r.slug !== creatorHit?.slug && r.review != null) ||
      compatible[1];

    const everyday =
      compatible.find(
        (r) =>
          r.slug !== creatorHit?.slug &&
          r.slug !== houseFav?.slug &&
          (r.slug === "classic-iced-latte" || r.slug === "vanilla-oat-latte" || r.sweetness_level === "none")
      ) ||
      compatible.find(
        (r) => r.slug !== creatorHit?.slug && r.slug !== houseFav?.slug
      );

    const list = [creatorHit, houseFav, everyday].filter(
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

  const handleChannelSelect = (channel: Channel) => {
    if (defaultChannel === channel) {
      setDefaultChannel(null); // Click active toggles off
    } else {
      setDefaultChannel(channel);
    }
  };

  const handleClearChannel = () => {
    setDefaultChannel(null);
  };

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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-10 sm:gap-14 text-left">
      {/* =========================================================================
          BLOCK 1: The Promise & Hardware Declaration Strip
          ========================================================================= */}
      <section className="flex flex-col gap-6">
        {/* Editorial Value Proposition */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#b8f600] border border-[#1a130e]/30 inline-block" />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#001ec0]">
              MULTI-CHANNEL COFFEE DIRECTORY
            </span>
          </div>

          <h1 className="font-syne text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#1a130e] tracking-tight leading-[1.08] max-w-4xl">
            You saw a coffee drink you want.
            <br />
            <span className="text-[#001ec0]">
              StickyMilk shows you how to make it with the coffee you have.
            </span>
          </h1>

          <p className="font-mono text-xs sm:text-sm text-[#7f756f] uppercase tracking-wider font-semibold pt-1">
            COMETEER · NESPRESSO VERTUO · SPECIALTY INSTANT
          </p>
        </div>

        {/* Hardware Declaration Strip */}
        <div className="bg-[#1a130e] text-white p-4 sm:p-5 border-2 border-black shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-2">
            <Coffee size={20} weight="fill" className="text-[#b8f600]" />
            <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
              MY COFFEE TODAY:
            </span>
          </div>

          {/* 4 Interactive Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
            {CHANNEL_OPTIONS.map(({ id, label, desc }) => {
              const active = defaultChannel === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleChannelSelect(id)}
                  aria-pressed={active}
                  className={`flex flex-col items-center justify-center px-4 py-2.5 border transition-all cursor-pointer text-center ${
                    active
                      ? "bg-[#b8f600] text-[#141f00] border-[#b8f600] font-bold shadow-[0_0_12px_rgba(184,246,0,0.35)]"
                      : "bg-[#221a15] text-[#d1c4bd] border-white/15 hover:border-white/40 hover:text-white"
                  }`}
                >
                  <span className="font-mono text-xs uppercase font-extrabold tracking-tight">
                    {active ? `● ${label}` : label}
                  </span>
                  <span
                    className={`font-mono text-[10px] tracking-tight mt-0.5 ${
                      active ? "text-[#141f00]/80" : "text-[#7f756f]"
                    }`}
                  >
                    {desc}
                  </span>
                </button>
              );
            })}

            {/* "All Systems" Button */}
            <button
              type="button"
              onClick={handleClearChannel}
              aria-pressed={defaultChannel === null}
              className={`flex flex-col items-center justify-center px-4 py-2.5 border transition-all cursor-pointer text-center ${
                defaultChannel === null
                  ? "bg-white text-[#1a130e] border-white font-bold shadow-sm"
                  : "bg-[#221a15] text-[#d1c4bd] border-white/15 hover:border-white/40 hover:text-white"
              }`}
            >
              <span className="font-mono text-xs uppercase font-extrabold tracking-tight">
                {defaultChannel === null ? "● ALL SYSTEMS" : "ALL SYSTEMS"}
              </span>
              <span
                className={`font-mono text-[10px] tracking-tight mt-0.5 ${
                  defaultChannel === null ? "text-[#1a130e]/70" : "text-[#7f756f]"
                }`}
              >
                Show All
              </span>
            </button>
          </div>
        </div>

        {/* Active System Notification Feedback */}
        {defaultChannel && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#edf0ff] border border-[#001ec0]/20 text-[#001ec0] font-mono text-xs">
            <span>
              Showing recipes, test kitchen reviews, and brew instructions calibrated for{" "}
              <strong>{CHANNEL_LABELS[defaultChannel]}</strong>.
            </span>
            <button
              type="button"
              onClick={handleClearChannel}
              className="underline hover:text-[#1a130e] font-bold cursor-pointer ml-3"
            >
              Reset to All Systems
            </button>
          </div>
        )}
      </section>

      {/* =========================================================================
          BLOCK 2: The Hero: Current Obsession (Lead Centerpiece Drink)
          ========================================================================= */}
      {heroRecipe && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b-2 border-[#1a130e] pb-2">
            <div className="flex items-center gap-2">
              <Sparkle size={18} weight="fill" className="text-[#001ec0]" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#1a130e]">
                TONY&apos;S CURRENT OBSESSION // TEST KITCHEN REVIEW
              </span>
            </div>
            <span className="font-mono text-xs font-bold uppercase text-[#001ec0]">
              {defaultChannel
                ? `TOP ${CHANNEL_LABELS[defaultChannel].toUpperCase()} PICK`
                : "TONY'S PICK"}
            </span>
          </div>

          <div className="w-full bg-[#1a130e] text-white border-2 border-black shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Left: Lead Content & Review Verdict */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6 border-b lg:border-b-0 lg:border-r border-white/10">
              <div className="flex flex-col gap-4">
                {/* HUD Row */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest px-2.5 py-0.5 bg-[#b8f600] text-[#141f00]">
                    {FORMAT_LABELS[heroRecipe.format]}
                  </span>
                  {leadPrep && (
                    <ProvenanceBadge
                      provenance={
                        leadPrep.provenance ??
                        (heroRecipe.source?.type === "vendor"
                          ? "original"
                          : "adapted")
                      }
                      size="sm"
                    />
                  )}
                  <span className="font-mono text-[11px] text-[#d1c4bd] uppercase">
                    {SWEETNESS_LABELS[heroRecipe.sweetness_level]}
                  </span>
                  <span className="font-mono text-[11px] text-[#7f756f]">
                    · {leadPrep?.prep_time_minutes ?? 4}:00 MIN PREP
                  </span>
                </div>

                {/* Drink Title */}
                <div>
                  <h2 className="font-syne text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1]">
                    {heroRecipe.name}
                  </h2>
                  {heroRecipe.source?.name && (
                    <div className="font-mono text-xs text-[#a89e97] mt-1.5 flex items-center gap-1.5">
                      <span>
                        {heroRecipe.source.type === "vendor"
                          ? "Created by:"
                          : "Inspired by:"}{" "}
                        {heroRecipe.source.handle || heroRecipe.source.name}
                      </span>
                      {heroRecipe.source.url && (
                        <a
                          href={heroRecipe.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#b8f600] hover:underline inline-flex items-center gap-0.5"
                        >
                          [Original Video ↗]
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* 10-Point Test Kitchen Score & Raw Verdict Quote */}
                <div className="bg-[#221a15] p-4 sm:p-5 border border-white/15 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star
                        size={18}
                        weight="fill"
                        className="text-[#b8f600]"
                      />
                      <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#b8f600]">
                        TONY&apos;S TAKE:
                      </span>
                    </div>
                    <span className="font-syne text-xl font-extrabold text-white">
                      {heroScore.toFixed(1)}{" "}
                      <span className="font-mono text-xs text-[#7f756f]">
                        / 10
                      </span>
                    </span>
                  </div>

                  <blockquote className="font-body text-sm sm:text-base text-[#f5eee9] italic border-l-2 border-[#b8f600] pl-3 leading-relaxed">
                    &ldquo;{heroVerdict}&rdquo;
                  </blockquote>
                </div>

                {/* Macro Nutrition Nuggets */}
                {heroNutrition && (
                  <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
                    <div className="bg-[#140e0a] p-2.5 border border-white/10">
                      <span className="text-[10px] uppercase text-[#7f756f] block">
                        CALORIES / SERVING
                      </span>
                      <span className="font-bold text-white text-sm">
                        {heroNutrition.calories} CAL
                      </span>
                    </div>
                    <div className="bg-[#140e0a] p-2.5 border border-white/10">
                      <span className="text-[10px] uppercase text-[#7f756f] block">
                        CAFFEINE / SERVING
                      </span>
                      <span className="font-bold text-[#b8f600] text-sm">
                        {heroNutrition.caffeine_mg} MG
                      </span>
                    </div>
                    <div className="bg-[#140e0a] p-2.5 border border-white/10">
                      <span className="text-[10px] uppercase text-[#7f756f] block">
                        SUGAR / SERVING
                      </span>
                      <span className="font-bold text-[#dfe0ff] text-sm">
                        {heroNutrition.sugar_g}G
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Hardware-Aware 1-Click Brew Action */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  href={`/recipes/${heroRecipe.slug}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#b8f600] hover:bg-white text-[#141f00] px-6 py-3.5 font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                >
                  <span>{getCtaLabel(defaultChannel)}</span>
                  <ArrowRight size={18} weight="bold" />
                </Link>

                <Link
                  href={`/recipes/${heroRecipe.slug}`}
                  className="px-4 py-3.5 bg-[#221a15] hover:bg-[#2c221c] text-[#d1c4bd] hover:text-white border border-white/15 font-mono text-xs uppercase tracking-wider text-center transition-colors cursor-pointer"
                >
                  View Recipe &amp; Steps
                </Link>
              </div>
            </div>

            {/* Right: Visual Artwork + How It's Made */}
            <div className="lg:col-span-5 relative flex flex-col justify-between p-6 sm:p-8 bg-[#140e0a]">
              {/* Image banner */}
              <div className="relative w-full aspect-square sm:aspect-video lg:aspect-square overflow-hidden border border-white/15 bg-[#221a15] shadow-inner mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroRecipe.image || heroImage?.imageUrl}
                  alt={heroImage?.imageAlt || heroRecipe.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 right-2 bg-[#1a130e]/85 backdrop-blur-sm px-2.5 py-1.5 border border-white/10 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#b8f600] font-bold uppercase">
                    {heroRecipe.sweetness_level.replace(/_/g, " ")}
                  </span>
                  <span className="text-[#d1c4bd]">
                    {defaultChannel
                      ? CHANNEL_LABELS[defaultChannel]
                      : "3 Coffee Formats"}
                  </span>
                </div>
              </div>

              {/* How It's Made / Base Mechanics */}
              <div className="bg-[#1a130e] p-4 border border-white/10 flex flex-col gap-2 text-xs font-mono">
                <div className="flex items-center justify-between text-[#b8f600] font-bold uppercase text-[11px]">
                  <span>HOW IT&apos;S MADE:</span>
                  <span>
                    {defaultChannel
                      ? CHANNEL_LABELS[defaultChannel].toUpperCase()
                      : "ALL 3 SYSTEMS"}
                  </span>
                </div>
                <p className="font-body text-xs text-[#d1c4bd] leading-relaxed">
                  {defaultChannel ? (
                    <>
                      <strong>Base:</strong> {BARISTA_DIFF[defaultChannel].coffeeBase}.{" "}
                      {BARISTA_DIFF[defaultChannel].reason}
                    </>
                  ) : (
                    "Works with Cometeer frozen extract, Nespresso Vertuo, and Specialty Instant."
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          BLOCK 3: The Translator CTA Strip (Visceral Outcome-First Language)
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
          BLOCK 4: The Counter Flight (3 Breathing Cards with Range & Pull-Quotes)
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
                : "3 high-conviction recipes spanning viral creator hits, house favorites, and daily drivers."}
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
