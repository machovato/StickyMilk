"use client";

import React, { useMemo, useState } from "react";
import { Coffee, MagnifyingGlass, X } from "@phosphor-icons/react";
import type {
  Recipe,
  Channel,
  SweetnessLevel,
  RoastRecommendation,
  CaffeineLevel,
} from "@/lib/types";
import { CHANNEL_LABELS } from "@/lib/types";
import { useChannel } from "@/lib/channel-context";
import { HeroBanner } from "./HeroBanner";
import { FilterSidebar } from "./FilterSidebar";
import { RecipeCard } from "./RecipeCard";

type SortOption = "popular" | "fastest" | "name";

export function RecipeLibrary({ recipes }: { recipes: Recipe[] }) {
  const { defaultChannel } = useChannel();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [selectedSweetness, setSelectedSweetness] = useState<Set<SweetnessLevel>>(
    new Set()
  );
  const [selectedRoasts, setSelectedRoasts] = useState<
    Set<RoastRecommendation>
  >(new Set());
  const [selectedCaffeine, setSelectedCaffeine] = useState<Set<CaffeineLevel>>(
    new Set()
  );
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [maxPrepTime, setMaxPrepTime] = useState<number>(Infinity);
  const [sortOption, setSortOption] = useState<SortOption>("popular");

  // Custom Ratio Formulator Band states
  const [bandConcentrate, setBandConcentrate] = useState<number>(50);
  const [bandCondensed, setBandCondensed] = useState<number>(20);

  // Toggle helpers
  const toggleSweetness = (s: SweetnessLevel) => {
    setSelectedSweetness((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const toggleRoast = (r: RoastRecommendation) => {
    setSelectedRoasts((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  const toggleCaffeine = (c: CaffeineLevel) => {
    setSelectedCaffeine((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    onlyCompatible ||
    selectedSweetness.size > 0 ||
    selectedRoasts.size > 0 ||
    selectedCaffeine.size > 0 ||
    selectedTags.size > 0 ||
    maxPrepTime !== Infinity;

  const handleResetFilters = () => {
    setSearchQuery("");
    setOnlyCompatible(false);
    setSelectedSweetness(new Set());
    setSelectedRoasts(new Set());
    setSelectedCaffeine(new Set());
    setSelectedTags(new Set());
    setMaxPrepTime(Infinity);
    setSortOption("popular");
  };

  // Available tags across all recipes
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const r of recipes) {
      for (const t of r.tags) set.add(t);
    }
    return Array.from(set).sort();
  }, [recipes]);

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes
      .filter((recipe) => {
        // Search query across name, notes, tags, source, and ingredients
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = recipe.name.toLowerCase().includes(q);
          const matchesNotes = recipe.flavor_notes.toLowerCase().includes(q);
          const matchesTags = recipe.tags.some((t) =>
            t.toLowerCase().includes(q)
          );
          const matchesSource =
            Boolean(recipe.source?.name?.toLowerCase().includes(q)) ||
            Boolean(recipe.source?.handle?.toLowerCase().includes(q));
          const matchesIngredients = recipe.preparations.some((p) =>
            p.ingredients.some((ing) => ing.item.toLowerCase().includes(q))
          );
          if (
            !matchesName &&
            !matchesNotes &&
            !matchesTags &&
            !matchesSource &&
            !matchesIngredients
          ) {
            return false;
          }
        }

        // Active coffee system compatibility check
        const prep = recipe.preparations.find(
          (p) => p.channel === defaultChannel
        );
        if (onlyCompatible && !prep) return false;

        // Sweetness filter
        if (
          selectedSweetness.size > 0 &&
          !selectedSweetness.has(recipe.sweetness_level)
        ) {
          return false;
        }

        // Tags filter
        if (
          selectedTags.size > 0 &&
          !recipe.tags.some((t) => selectedTags.has(t))
        ) {
          return false;
        }

        // Preparation-specific filters (evaluated against the active channel prep if available)
        if (prep) {
          if (
            selectedRoasts.size > 0 &&
            (!prep.roast_recommendation ||
              !selectedRoasts.has(prep.roast_recommendation))
          ) {
            return false;
          }
          if (
            selectedCaffeine.size > 0 &&
            !selectedCaffeine.has(prep.caffeine_level)
          ) {
            return false;
          }
          if (prep.prep_time_minutes > maxPrepTime) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === "fastest") {
          const minPrepA = Math.min(
            ...a.preparations.map((p) => p.prep_time_minutes)
          );
          const minPrepB = Math.min(
            ...b.preparations.map((p) => p.prep_time_minutes)
          );
          return minPrepA - minPrepB;
        }
        if (sortOption === "name") {
          return a.name.localeCompare(b.name);
        }
        // Default popular: verified recipes first, then by name
        if (a.status === "verified" && b.status !== "verified") return -1;
        if (a.status !== "verified" && b.status === "verified") return 1;
        return 0;
      });
  }, [
    recipes,
    searchQuery,
    onlyCompatible,
    defaultChannel,
    selectedSweetness,
    selectedTags,
    selectedRoasts,
    selectedCaffeine,
    maxPrepTime,
    sortOption,
  ]);

  // Metrics for HeroBanner
  const avgDurationFormatted = useMemo(() => {
    const allTimes = recipes.flatMap((r) =>
      r.preparations.map((p) => p.prep_time_minutes)
    );
    if (allTimes.length === 0) return "04:30s";
    const avg = allTimes.reduce((acc, t) => acc + t, 0) / allTimes.length;
    const mins = Math.floor(avg);
    const secs = Math.round((avg - mins) * 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}s`;
  }, [recipes]);

  const calculatedRatio = (
    bandConcentrate / (bandCondensed > 0 ? bandCondensed : 1)
  ).toFixed(1);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Hero Atmospheric Banner */}
      <HeroBanner
        totalCount={recipes.length}
        avgDuration={avgDurationFormatted}
        condensedRatio="1:2.5 Target"
      />

      {/* Split View: Left Filter Rail + Recipe Stream */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Filter Rail */}
        <div className="lg:col-span-4 xl:col-span-3">
          <FilterSidebar
            sweetness={selectedSweetness}
            onToggleSweetness={toggleSweetness}
            roasts={selectedRoasts}
            onToggleRoast={toggleRoast}
            caffeineLevels={selectedCaffeine}
            onToggleCaffeine={toggleCaffeine}
            selectedTags={selectedTags}
            availableTags={availableTags}
            onToggleTag={toggleTag}
            maxPrepTime={maxPrepTime}
            onPrepTimeChange={setMaxPrepTime}
            onResetFilters={handleResetFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Main Recipe Archive Stream */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-5">
          {/* Instant Client-side Search Bar */}
          <div className="relative w-full bg-white border-2 border-[#1a130e] shadow-sm flex items-center">
            <div className="pl-3.5 pr-2 text-[#7f756f] flex items-center flex-shrink-0">
              <MagnifyingGlass size={20} weight="bold" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search recipes, ingredients (condensed milk, tonic, ube), flavor notes, or creators...`}
              className="w-full py-3 pr-10 font-mono text-xs sm:text-sm text-[#1a130e] placeholder-[#a89e97] bg-transparent focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 p-1 text-[#7f756f] hover:text-[#1a130e] font-mono text-xs cursor-pointer"
                title="Clear search"
              >
                <X size={16} weight="bold" />
              </button>
            )}
          </div>

          {/* Sorting & Live Tally Bar */}
          <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white shadow-sm border border-[#1a130e]/10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-3 h-3 bg-[#b8f600] inline-block border border-[#1a130e]/30" />
              <span className="font-syne font-bold text-lg text-[#1a130e] uppercase tracking-tight">
                AVAILABLE RECIPES:
              </span>
              <span className="font-mono text-xs font-bold text-[#001ec0] bg-[#dfe0ff] px-2.5 py-0.5">
                {filteredRecipes.length} of {recipes.length} AVAILABLE
              </span>

              {/* My Coffee Compatibility Lens Toggle */}
              <button
                type="button"
                onClick={() => setOnlyCompatible((prev) => !prev)}
                className={`ml-1 px-2.5 py-1 font-mono text-xs font-bold uppercase transition-all cursor-pointer border ${
                  onlyCompatible
                    ? "bg-[#1a130e] text-[#b8f600] border-[#1a130e] shadow-xs"
                    : "bg-[#f8f2ee] text-[#7f756f] border-[#1a130e]/20 hover:text-[#1a130e]"
                }`}
                title={`Filter exclusively to drinks with an active ${CHANNEL_LABELS[defaultChannel]} formulation`}
              >
                {onlyCompatible ? `✓ ${CHANNEL_LABELS[defaultChannel].toUpperCase()} ONLY` : `+ FILTER FOR ${CHANNEL_LABELS[defaultChannel].toUpperCase()}`}
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="font-mono text-[11px] font-bold uppercase text-[#4d4540]">
                ORDER BY:
              </span>
              <div className="flex items-center gap-1 bg-[#f8f2ee] p-1 border border-[#1a130e]/10">
                <button
                  type="button"
                  onClick={() => setSortOption("popular")}
                  className={`px-3 py-1 font-mono text-xs transition-colors cursor-pointer ${
                    sortOption === "popular"
                      ? "bg-[#1a130e] text-white font-bold"
                      : "text-[#1d1b19] hover:bg-[#ede7e3]"
                  }`}
                >
                  Most Popular
                </button>
                <button
                  type="button"
                  onClick={() => setSortOption("fastest")}
                  className={`px-3 py-1 font-mono text-xs transition-colors cursor-pointer ${
                    sortOption === "fastest"
                      ? "bg-[#1a130e] text-white font-bold"
                      : "text-[#1d1b19] hover:bg-[#ede7e3]"
                  }`}
                >
                  Fastest Brew
                </button>
                <button
                  type="button"
                  onClick={() => setSortOption("name")}
                  className={`px-3 py-1 font-mono text-xs transition-colors cursor-pointer ${
                    sortOption === "name"
                      ? "bg-[#1a130e] text-white font-bold"
                      : "text-[#1d1b19] hover:bg-[#ede7e3]"
                  }`}
                >
                  A to Z
                </button>
              </div>
            </div>
          </div>

          {/* 3-Column Recipe Grid */}
          {filteredRecipes.length === 0 ? (
            <div className="p-12 bg-white border border-[#1a130e]/10 text-center flex flex-col items-center justify-center gap-4">
              <Coffee size={56} weight="bold" className="text-[#d1c4bd]" />
              <h3 className="font-syne text-xl font-bold text-[#1a130e]">
                No matching recipes found
              </h3>
              <p className="font-body text-sm text-[#4d4540] max-w-md">
                Try resetting your filters or search terms to see all recipes.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 bg-[#001ec0] text-white font-mono text-xs uppercase font-bold tracking-wider hover:bg-[#1a130e] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredRecipes.map((recipe) => (
                <RecipeCard
                  key={recipe.slug}
                  recipe={recipe}
                  channel={defaultChannel}
                />
              ))}
            </div>
          )}

          {/* Quick Interactive Ratio Converter Band */}
          <div className="w-full p-6 sm:p-8 bg-white mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm border border-[#1a130e]/10">
            <div className="flex flex-col gap-1 max-w-md">
              <span className="font-mono text-[11px] font-bold text-[#001ec0] uppercase tracking-widest">
                SENSORY FORMULATOR
              </span>
              <h3 className="font-syne text-xl sm:text-2xl font-bold text-[#1a130e]">
                Need a custom dilution ratio?
              </h3>
              <p className="font-body text-xs sm:text-sm text-[#4d4540] leading-relaxed">
                Calculate exact condensed gram weights against coffee
                concentrate for target sweetness saturation without equipment.
              </p>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 flex-wrap sm:flex-nowrap">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-[#7f756f] uppercase">
                  CONCENTRATE
                </span>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={bandConcentrate}
                    onChange={(e) => setBandConcentrate(Number(e.target.value))}
                    className="font-syne text-2xl font-bold text-[#1a130e] w-14 bg-transparent border-b border-[#1a130e]/30 focus:border-[#001ec0] focus:outline-none"
                  />
                  <span className="font-syne text-2xl font-bold text-[#1a130e]">
                    g
                  </span>
                </div>
              </div>

              <span className="font-syne text-2xl font-bold text-[#001ec0] self-end mb-1">
                :
              </span>

              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-[#7f756f] uppercase">
                  CONDENSED MILK
                </span>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={bandCondensed}
                    onChange={(e) => setBandCondensed(Number(e.target.value))}
                    className="font-syne text-2xl font-bold text-[#1a130e] w-14 bg-transparent border-b border-[#1a130e]/30 focus:border-[#001ec0] focus:outline-none"
                  />
                  <span className="font-syne text-2xl font-bold text-[#1a130e]">
                    g
                  </span>
                </div>
              </div>

              <div className="px-4 py-2.5 bg-[#dfe0ff] text-[#000a63] font-mono text-xs font-bold uppercase ml-2 border border-[#001ec0]/20">
                Ratio 1 : {calculatedRatio}
              </div>
            </div>
          </div>

          {/* Editorial Note */}
          <EditorialNote />
        </div>
      </div>
    </div>
  );
}

function EditorialNote() {
  return (
    <section className="mt-4 p-6 bg-[#f8f2ee] border border-[#1a130e]/10 text-left">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-[#001ec0]" />
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#001ec0]">
          Brew Physics // SCM Dynamics
        </p>
      </div>
      <h2 className="mt-2 font-syne text-xl font-bold text-[#1a130e]">
        Why sweetened condensed milk doesn&apos;t curdle against dark coffee
      </h2>
      <p className="mt-2 font-body text-sm leading-relaxed text-[#4d4540] max-w-3xl">
        Condensed milk&apos;s heavy sucrose content (~55%) stabilizes dairy
        proteins, making them resistant to acid coagulation from intense coffee
        extracts. A boiling hot espresso or chilled Cometeer concentrate can pour
        directly onto dense condensed milk without breaking the emulsion. Dark
        roasts provide the structural bitterness and body needed to balance the
        caramelized dairy sweetness.
      </p>
    </section>
  );
}
