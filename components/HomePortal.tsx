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
import { RecipeCard } from "./RecipeCard";

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
    desc: "Vertuo High-Bar",
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

  // 4 Curated Counter Flight Cards (excluding the hero recipe to eliminate duplication)
  const flightRecipes = useMemo(() => {
    return recipes
      .filter((r) => r.slug !== heroRecipe?.slug)
      .filter((r) => {
        if (!defaultChannel) return true;
        return r.preparations.some((p) => p.channel === defaultChannel);
      })
      .sort((a, b) => {
        const scoreA =
          (defaultChannel && a.review?.channel_scores?.[defaultChannel]) ??
          a.review?.score ??
          0;
        const scoreB =
          (defaultChannel && b.review?.channel_scores?.[defaultChannel]) ??
          b.review?.score ??
          0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 4);
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

          <p className="font-mono text-xs sm:text-sm text-[#7f756f] uppercase tracking-wider font-semibold">
            COMETEER · NESPRESSO VERTUO · SPECIALTY INSTANT
          </p>
        </div>

        {/* Hardware Declaration Strip */}
        <div className="bg-[#1a130e] text-white p-4 sm:p-5 border-2 border-black shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
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

            {/* "I'm Just Browsing" Button */}
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
                {defaultChannel === null ? "● ALL SYSTEMS" : "JUST BROWSING"}
              </span>
              <span
                className={`font-mono text-[10px] tracking-tight mt-0.5 ${
                  defaultChannel === null ? "text-[#1a130e]/70" : "text-[#7f756f]"
                }`}
              >
                No Filter
              </span>
            </button>
          </div>
        </div>

        {/* Active System Notification Feedback */}
        {defaultChannel && (
          <div className="flex items-center justify-between px-4 py-2 bg-[#edf0ff] border border-[#001ec0]/20 text-[#001ec0] font-mono text-xs">
            <span>
              Showing recipes, test kitchen reviews, and brew math calibrated for{" "}
              <strong>{CHANNEL_LABELS[defaultChannel]}</strong>.
            </span>
            <button
              type="button"
              onClick={handleClearChannel}
              className="underline hover:text-[#1a130e] font-bold cursor-pointer ml-3"
            >
              Clear filter
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
                TONY&apos;S CURRENT OBSESSION // LEAD DRINK SPEC
              </span>
            </div>
            <span className="font-mono text-xs font-bold uppercase text-[#001ec0]">
              {defaultChannel
                ? `TOP ${CHANNEL_LABELS[defaultChannel].toUpperCase()} PICK`
                : "TEST KITCHEN BENCHMARK"}
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
                          ? "Official Spec:"
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
                          [Original ↗]
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
                        TEST KITCHEN VERDICT:
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
                        CALORIES
                      </span>
                      <span className="font-bold text-white text-sm">
                        {heroNutrition.calories} CAL
                      </span>
                    </div>
                    <div className="bg-[#140e0a] p-2.5 border border-white/10">
                      <span className="text-[10px] uppercase text-[#7f756f] block">
                        CAFFEINE
                      </span>
                      <span className="font-bold text-[#b8f600] text-sm">
                        {heroNutrition.caffeine_mg} MG
                      </span>
                    </div>
                    <div className="bg-[#140e0a] p-2.5 border border-white/10">
                      <span className="text-[10px] uppercase text-[#7f756f] block">
                        SUGAR
                      </span>
                      <span className="font-bold text-[#dfe0ff] text-sm">
                        {heroNutrition.sugar_g}G
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 1-Click Brew Action */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <Link
                  href={`/recipes/${heroRecipe.slug}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#b8f600] hover:bg-white text-[#141f00] px-6 py-3.5 font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                >
                  <span>BREW THIS RECIPE</span>
                  <ArrowRight size={18} weight="bold" />
                </Link>

                <Link
                  href={`/recipes/${heroRecipe.slug}`}
                  className="px-4 py-3.5 bg-[#221a15] hover:bg-[#2c221c] text-[#d1c4bd] hover:text-white border border-white/15 font-mono text-xs uppercase tracking-wider text-center transition-colors cursor-pointer"
                >
                  View Full Spec
                </Link>
              </div>
            </div>

            {/* Right: Visual Artwork + Barista Diff Highlights */}
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
                    {heroRecipe.preparations.length} Channel Formulations
                  </span>
                </div>
              </div>

              {/* Coffee Base Mechanics */}
              <div className="bg-[#1a130e] p-4 border border-white/10 flex flex-col gap-2 text-xs font-mono">
                <div className="flex items-center justify-between text-[#b8f600] font-bold uppercase text-[11px]">
                  <span>HARDWARE CALIBRATION:</span>
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
                    "Available in 100% parity across Cometeer frozen extract, Nespresso Vertuo espresso, and dissolved instant bloom."
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          BLOCK 3: The Translator CTA Strip (Community & Ingestion Hook)
          ========================================================================= */}
      <section className="bg-[#001ec0] text-white p-6 sm:p-8 border-2 border-black shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#b8f600] text-[#141f00] font-mono text-[10px] font-extrabold uppercase tracking-widest">
                INTAKE &amp; TRANSLATION ENGINE
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-white/80">
                SPRINT 4
              </span>
            </div>

            <h2 className="font-syne text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              TRANSLATE FOR MY COFFEE
            </h2>

            <p className="font-body text-sm sm:text-base text-[#dfe0ff] leading-relaxed">
              Saw a viral drink on TikTok or Instagram? Paste the link below.
              StickyMilk calculates the espresso extraction for your counter machine,
              runs an honest calorie &amp; caffeine reality check, and formats a temperature-stable prep.
            </p>
          </div>

          {/* Interactive URL Input & CTA Button */}
          <form
            onSubmit={handleTranslatorSubmit}
            className="flex flex-col sm:flex-row items-stretch gap-2.5 w-full lg:w-auto flex-shrink-0"
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
              <span>TRANSLATE RECIPE</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </form>
        </div>
      </section>

      {/* =========================================================================
          BLOCK 4: The Counter Flight (4 Curated Cards) + Vault Handoff
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
                ? `4 curated drinks tested and calibrated specifically for ${CHANNEL_LABELS[defaultChannel]}.`
                : "4 high-conviction favorites evaluated with 10-point test kitchen scores."}
            </p>
          </div>

          <Link
            href="/recipes"
            className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase text-[#001ec0] hover:text-[#1a130e] transition-colors"
          >
            <span>View all {recipes.length} drinks in Archive</span>
            <ArrowRight size={14} weight="bold" />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {flightRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.slug}
              recipe={recipe}
              channel={defaultChannel}
            />
          ))}
        </div>

        {/* Complete Vault Handoff Callout Banner */}
        <div className="mt-6 bg-[#f3ede9] border-2 border-[#1a130e] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="flex flex-col gap-1.5 max-w-2xl">
            <span className="font-mono text-xs font-bold uppercase text-[#001ec0] tracking-wider">
              LOOKING FOR SOMETHING SPECIFIC?
            </span>
            <h4 className="font-syne text-xl sm:text-2xl font-bold text-[#1a130e] tracking-tight">
              Explore the Complete Recipe Vault
            </h4>
            <p className="font-body text-xs sm:text-sm text-[#4d4540] leading-relaxed">
              Search all {recipes.length} multi-channel drinks with instant full-text search,
              sweetness filters, roast tags, creator portfolios, and custom ratio formulators.
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
