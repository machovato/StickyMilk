import React from "react";
import { Sliders, Flask } from "@phosphor-icons/react";
import type {
  SweetnessLevel,
  RoastRecommendation,
  CaffeineLevel,
} from "@/lib/types";

interface FilterSidebarProps {
  sweetness: Set<SweetnessLevel>;
  onToggleSweetness: (s: SweetnessLevel) => void;
  roasts: Set<RoastRecommendation>;
  onToggleRoast: (r: RoastRecommendation) => void;
  caffeineLevels: Set<CaffeineLevel>;
  onToggleCaffeine: (c: CaffeineLevel) => void;
  selectedTags: Set<string>;
  availableTags: string[];
  onToggleTag: (tag: string) => void;
  maxPrepTime: number;
  onPrepTimeChange: (time: number) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

const PREP_TIME_BUCKETS = [
  { label: "ALL", max: Infinity },
  { label: "<5M", max: 5 },
  { label: "<10M", max: 10 },
  { label: "<15M", max: 15 },
];

export function FilterSidebar({
  sweetness,
  onToggleSweetness,
  roasts,
  onToggleRoast,
  caffeineLevels,
  onToggleCaffeine,
  selectedTags,
  availableTags,
  onToggleTag,
  maxPrepTime,
  onPrepTimeChange,
  onResetFilters,
  hasActiveFilters,
}: FilterSidebarProps) {
  return (
    <aside className="sticky top-24 flex flex-col gap-5 bg-white p-5 shadow-sm border border-[#1a130e]/10">
      {/* Title & Reset */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1a130e]/10">
        <div className="flex items-center gap-2">
          <Sliders size={20} weight="bold" className="text-[#1a130e]" />
          <span className="font-syne text-sm font-bold uppercase tracking-wider text-[#1a130e]">
            Formula Filters
          </span>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          disabled={!hasActiveFilters}
          className="font-mono text-xs text-[#001ec0] hover:text-[#1a130e] transition-colors cursor-pointer uppercase font-bold disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      {/* Condensed Sweetness */}
      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[11px] font-bold uppercase text-[#4d4540] tracking-wider">
          Condensed Sweetness
        </label>
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onToggleSweetness("none")}
            className={`px-2 py-2 font-mono text-xs text-center transition-all cursor-pointer ${
              sweetness.has("none")
                ? "bg-[#1a130e] text-white font-bold"
                : "bg-[#f3ede9] text-[#1d1b19] hover:bg-[#1a130e] hover:text-white"
            }`}
          >
            NOT SWEET
          </button>
          <button
            type="button"
            onClick={() => onToggleSweetness("subtle")}
            className={`px-2 py-2 font-mono text-xs text-center transition-all cursor-pointer ${
              sweetness.has("subtle")
                ? "bg-[#1a130e] text-white font-bold"
                : "bg-[#f3ede9] text-[#1d1b19] hover:bg-[#1a130e] hover:text-white"
            }`}
          >
            SUBTLE (1:4)
          </button>
          <button
            type="button"
            onClick={() => onToggleSweetness("rich_sweet")}
            className={`px-2 py-2 font-mono text-xs text-center transition-all cursor-pointer ${
              sweetness.has("rich_sweet")
                ? "bg-[#1a130e] text-white font-bold"
                : "bg-[#f3ede9] text-[#1d1b19] hover:bg-[#1a130e] hover:text-white"
            }`}
          >
            RICH (1:2.5)
          </button>
          <button
            type="button"
            onClick={() => onToggleSweetness("dessert")}
            className={`px-2 py-2 font-mono text-xs text-center transition-all cursor-pointer ${
              sweetness.has("dessert")
                ? "bg-[#1a130e] text-white font-bold"
                : "bg-[#f3ede9] text-[#1d1b19] hover:bg-[#1a130e] hover:text-white"
            }`}
          >
            DESSERT HEAVY
          </button>
        </div>
      </div>

      {/* Roast Intensity Profile */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <label className="font-mono text-[11px] font-bold uppercase text-[#4d4540] tracking-wider">
            Roast Profile
          </label>
          <span className="font-mono text-xs text-[#001ec0] font-bold">
            {roasts.size === 0
              ? "ALL ROASTS"
              : Array.from(roasts).join("/").toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 pt-1">
          <button
            type="button"
            onClick={() => onToggleRoast("dark")}
            className={`py-1.5 font-mono text-xs text-center cursor-pointer transition-colors ${
              roasts.has("dark")
                ? "bg-[#1a130e] text-white font-bold"
                : "bg-[#f3ede9] text-[#1d1b19] hover:bg-[#ede7e3]"
            }`}
          >
            DARK
          </button>
          <button
            type="button"
            onClick={() => onToggleRoast("medium")}
            className={`py-1.5 font-mono text-xs text-center cursor-pointer transition-colors ${
              roasts.has("medium")
                ? "bg-[#1a130e] text-white font-bold"
                : "bg-[#f3ede9] text-[#1d1b19] hover:bg-[#ede7e3]"
            }`}
          >
            MEDIUM
          </button>
          <button
            type="button"
            onClick={() => onToggleRoast("light")}
            className={`py-1.5 font-mono text-xs text-center cursor-pointer transition-colors ${
              roasts.has("light")
                ? "bg-[#1a130e] text-white font-bold"
                : "bg-[#f3ede9] text-[#1d1b19] hover:bg-[#ede7e3]"
            }`}
          >
            LIGHT
          </button>
        </div>
      </div>

      {/* Caffeine Potency Level */}
      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[11px] font-bold uppercase text-[#4d4540] tracking-wider">
          Caffeine Level
        </label>
        <div className="flex flex-col gap-1 pt-1">
          <label className="flex items-center justify-between p-2 bg-[#f3ede9] text-[#1d1b19] cursor-pointer hover:bg-[#ede7e3] transition-colors">
            <span className="font-mono text-xs">FULL CAFFEINE</span>
            <input
              type="checkbox"
              checked={caffeineLevels.has("full")}
              onChange={() => onToggleCaffeine("full")}
              className="accent-[#1a130e] w-4 h-4 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between p-2 bg-[#f3ede9] text-[#1d1b19] cursor-pointer hover:bg-[#ede7e3] transition-colors">
            <span className="font-mono text-xs">HALF CAFFEINE</span>
            <input
              type="checkbox"
              checked={caffeineLevels.has("half")}
              onChange={() => onToggleCaffeine("half")}
              className="accent-[#1a130e] w-4 h-4 cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between p-2 bg-[#f3ede9] text-[#1d1b19] cursor-pointer hover:bg-[#ede7e3] transition-colors">
            <span className="font-mono text-xs">DECAF / TRACE</span>
            <input
              type="checkbox"
              checked={caffeineLevels.has("decaf")}
              onChange={() => onToggleCaffeine("decaf")}
              className="accent-[#1a130e] w-4 h-4 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* Prep Time */}
      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[11px] font-bold uppercase text-[#4d4540] tracking-wider">
          Prep Duration
        </label>
        <div className="grid grid-cols-4 gap-1 pt-1">
          {PREP_TIME_BUCKETS.map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => onPrepTimeChange(b.max)}
              className={`py-1.5 font-mono text-xs text-center cursor-pointer transition-colors ${
                maxPrepTime === b.max
                  ? "bg-[#1a130e] text-white font-bold"
                  : "bg-[#f3ede9] text-[#1d1b19] hover:bg-[#ede7e3]"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Context & Occasion */}
      {availableTags.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[11px] font-bold uppercase text-[#4d4540] tracking-wider">
            Context &amp; Mood
          </label>
          <div className="flex flex-wrap gap-1 pt-1 max-h-36 overflow-y-auto">
            {availableTags.map((tag) => {
              const isSelected = selectedTags.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  className={`px-2 py-1 font-mono text-[11px] uppercase transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#dfe0ff] text-[#000a63] font-bold"
                      : "bg-[#f3ede9] text-[#1d1b19] hover:bg-[#1a130e] hover:text-white"
                  }`}
                >
                  {tag.replace(/-/g, " ")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Channel Translation Tip Box */}
      <div className="p-3.5 bg-[#1a130e] text-white flex flex-col gap-2 mt-1 border border-[#1a130e]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold text-[#b8f600] tracking-wider uppercase">
            CHANNEL SWAPPING
          </span>
        </div>
        <p className="text-xs font-syne font-bold text-white leading-snug">
          Got Cometeer, Nespresso, or Instant?
        </p>
        <p className="text-[11px] text-[#d1c4bd] font-body leading-relaxed">
          Toggle the header channel anytime. StickyMilk translates the steps and measurements so you can brew with what you have on hand.
        </p>
      </div>
    </aside>
  );
}
