"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Coffee,
  Copy,
  Lightning,
  Sparkle,
  Thermometer,
  CaretDown,
  CaretUp,
  FloppyDisk,
  Warning,
  CheckCircle,
  VideoCamera,
} from "@phosphor-icons/react";
import type { Channel } from "@/lib/types";
import { CHANNEL_LABELS } from "@/lib/types";
import { useChannel } from "@/lib/channel-context";
import { DEMO_PRESETS, type DemoPreset } from "@/lib/translator/extractor";
import type { TranslationResult } from "@/lib/translator/types";
import {
  translateRecipeAction,
  saveTranslatedRecipeAction,
} from "@/lib/actions/translate-recipe";

interface TranslatorHUDProps {
  initialUrl?: string;
  isAdmin: boolean;
  initialResult?: TranslationResult;
}

export function TranslatorHUD({
  initialUrl = "",
  isAdmin,
  initialResult,
}: TranslatorHUDProps) {
  const router = useRouter();
  const resultRef = useRef<HTMLDivElement>(null);
  const { defaultChannel, setDefaultChannel } = useChannel();
  const [selectedChannel, setSelectedChannel] = useState<Channel>(defaultChannel || "nespresso");

  const [url, setUrl] = useState(initialUrl);
  const [caption, setCaption] = useState("");
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [showTextOverlays, setShowTextOverlays] = useState(true);
  const [isTranslating, startTranslating] = useTransition();
  const [isSaving, startSaving] = useTransition();

  const [result, setResult] = useState<TranslationResult | null>(initialResult || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Sync selected channel when global header selector changes
  const activeChannel: Channel = defaultChannel || selectedChannel;
  const handleChannelChange = (ch: Channel) => {
    setSelectedChannel(ch);
    setDefaultChannel(ch);
  };

  const handleSelectPreset = (preset: DemoPreset) => {
    setUrl(preset.url);
    setCaption(preset.caption);
    setShowCaptionInput(true);
    setErrorMessage(null);
    setSavedSlug(null);

    startTranslating(async () => {
      const res = await translateRecipeAction({
        url: preset.url,
        caption: preset.caption,
      });
      if (res.success && res.result) {
        setResult(res.result);
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      } else {
        setErrorMessage(res.error || "Failed to translate preset");
      }
    });
  };

  const handleTranslate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() && !caption.trim()) {
      setErrorMessage("Please paste a video URL or recipe caption.");
      return;
    }
    setErrorMessage(null);
    setSavedSlug(null);

    startTranslating(async () => {
      const res = await translateRecipeAction({
        url: url.trim(),
        caption: caption.trim() || undefined,
      });
      if (res.success && res.result) {
        setResult(res.result);
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 150);
      } else {
        setErrorMessage(res.error || "Translation failed");
      }
    });
  };

  const handleSaveToVault = () => {
    if (!result || !isAdmin) return;
    setErrorMessage(null);

    startSaving(async () => {
      const res = await saveTranslatedRecipeAction(result.recipe);
      if (res.success && res.slug) {
        setSavedSlug(res.slug);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Failed to save to vault");
      }
    });
  };

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.recipe, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const activePrep = result
    ? result.recipe.preparations.find((p) => p.channel === activeChannel) ||
      result.recipe.preparations[0]
    : null;

  const activeMacros = result ? result.nutritional_breakdowns[activeChannel] : null;

  return (
    <div className="flex flex-col gap-10">
      {/* Intake & Presets Card */}
      <div className="bg-white p-6 sm:p-8 border-2 border-black shadow-lg flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono text-xs font-bold uppercase text-[#1a130e] tracking-wider">
              INPUT RECIPE LINK OR CAPTION
            </span>
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#fef8f4] border border-[#1a130e]/20 text-[#1a130e]">
              TIKTOK • INSTAGRAM • YOUTUBE SHORTS • GEMINI VIDEO AI
            </span>
          </div>
          <p className="font-body text-xs text-[#7f756f]">
            Drop any viral coffee video link. Gemini Multimodal AI watches the reel, reads on-screen text overlays, and calibrates honest home ratios.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#7f756f] font-bold">
            ⚡ Quick 1-Click Trending Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {DEMO_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                disabled={isTranslating}
                className="px-3 py-1.5 bg-[#fef8f4] hover:bg-[#b8f600] hover:text-[#141f00] text-[#1a130e] font-mono text-xs font-bold border border-[#1a130e]/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkle size={13} weight="fill" className="text-[#001ec0]" />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Input */}
        <form onSubmit={handleTranslate} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@creator/video/... or https://www.instagram.com/reel/..."
              className="flex-1 px-4 py-3.5 bg-[#fef8f4] text-[#1a130e] placeholder-[#a89e97] font-mono text-xs sm:text-sm border-2 border-[#1a130e]/30 focus:border-[#1a130e] focus:outline-none"
            />
            <button
              type="submit"
              disabled={isTranslating}
              className="px-6 py-3.5 bg-[#1a130e] hover:bg-[#001ec0] text-[#b8f600] font-mono text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-colors border-2 border-black flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60 whitespace-nowrap"
            >
              <span>
                {isTranslating
                  ? url && !caption
                    ? "AI WATCHING VIDEO & EXTRACTING..."
                    : "TRANSLATING RECIPE..."
                  : "TRANSLATE FOR MY COFFEE"}
              </span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>

          {/* Toggle Raw Caption Textarea */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowCaptionInput((prev) => !prev)}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-[#001ec0] hover:text-[#1a130e] self-start font-bold cursor-pointer"
            >
              {showCaptionInput ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
              <span>{showCaptionInput ? "Hide video transcript / caption" : "Paste video transcript or caption (optional)"}</span>
            </button>

            {showCaptionInput && (
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={6}
                placeholder="Paste video caption or ingredient transcript here (e.g. 'Cold foam: 2 tbsp heavy cream, 1 tbsp milk...')"
                className="w-full p-3 bg-[#fef8f4] text-[#1a130e] placeholder-[#a89e97] font-mono text-xs border border-[#1a130e]/30 focus:border-[#1a130e] focus:outline-none resize-y"
              />
            )}
          </div>
        </form>

        {isTranslating && (
          <div className="p-4 bg-[#001ec0]/10 border-2 border-[#001ec0] text-[#001ec0] font-mono text-xs flex items-center gap-2.5 animate-pulse">
            <VideoCamera size={20} weight="fill" className="text-[#001ec0]" />
            <span>
              <strong>Gemini Multimodal AI is active:</strong> Downloading video stream, analyzing visual frames, and transcribing text overlays...
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-[#ffebee] border-2 border-[#ba1a1a] text-[#ba1a1a] font-mono text-xs flex items-center gap-2">
            <Warning size={18} weight="bold" />
            <span>{errorMessage}</span>
          </div>
        )}

        {savedSlug && (
          <div className="p-4 bg-[#b8f600]/20 border-2 border-[#141f00] text-[#141f00] font-mono text-xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} weight="fill" className="text-[#001ec0]" />
              <span>
                <strong>Saved to Vault!</strong> Status: <code className="bg-white px-1.5 py-0.5">needs_testing</code>
              </span>
            </div>
            <Link
              href={`/recipes/${savedSlug}`}
              className="px-3 py-1 bg-[#1a130e] text-[#b8f600] uppercase font-bold hover:bg-[#001ec0] transition-colors"
            >
              View In Vault →
            </Link>
          </div>
        )}
      </div>

      {/* Translation Result HUD */}
      {result && (
        <div ref={resultRef} className="flex flex-col gap-8 animate-fadeIn scroll-mt-6">
          {/* Result Header Bar */}
          <div className="bg-[#1a130e] text-white p-6 sm:p-8 border-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#b8f600] text-[#141f00] uppercase">
                  TRANSLATED SPEC
                </span>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#fef8f4] text-[#1a130e] uppercase">
                  STATUS: {result.recipe.status.toUpperCase()}
                </span>
                {result.extraction_mode === "video_multimodal_ai" && (
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#001ec0] text-white uppercase flex items-center gap-1">
                    <VideoCamera size={14} weight="fill" />
                    <span>AI VIDEO OVERLAY EXTRACTION</span>
                  </span>
                )}
                <span className="font-mono text-xs text-[#a89e97]">
                  SLUG: <code className="text-[#b8f600]">{result.recipe.slug}</code>
                </span>
              </div>

              <h2 className="font-syne text-2xl sm:text-4xl font-extrabold text-[#fef8f4] tracking-tight">
                {result.recipe.name}
              </h2>

              <div className="flex items-center gap-3 text-xs font-mono text-[#d1c4bd] flex-wrap">
                <span>By <strong>{result.ir.source_creator?.name}</strong> ({result.ir.source_creator?.handle})</span>
                <span>•</span>
                <span>Source: {result.ir.source_creator?.platform}</span>
                {result.ir.source_url && (
                  <>
                    <span>•</span>
                    <a
                      href={result.ir.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#b8f600] underline hover:text-white"
                    >
                      Original Video Link ↗
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold border border-white/30 uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
              >
                {copiedJson ? <Check size={16} weight="bold" /> : <Copy size={16} weight="bold" />}
                <span>{copiedJson ? "COPIED JSON" : "EXPORT JSON"}</span>
              </button>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={handleSaveToVault}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#b8f600] hover:bg-[#001ec0] text-[#141f00] hover:text-white font-mono text-xs font-extrabold uppercase tracking-wider transition-colors border-2 border-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FloppyDisk size={16} weight="bold" />
                  <span>{isSaving ? "SAVING TO VAULT..." : "SAVE TO VAULT"}</span>
                </button>
              ) : (
                <Link
                  href="/admin/login?next=/translate"
                  className="px-4 py-2.5 bg-white/10 hover:bg-[#b8f600] hover:text-[#141f00] text-white font-mono text-xs font-bold border border-white/30 uppercase tracking-wider transition-colors flex items-center gap-2"
                >
                  <span>ADMIN LOGIN TO SAVE</span>
                </Link>
              )}
            </div>
          </div>

          {/* Text Overlays Read On Screen Pill */}
          {result.text_overlays && result.text_overlays.length > 0 && (
            <div className="bg-[#fef8f4] border-2 border-[#001ec0] p-4 flex flex-col gap-2">
              <div
                onClick={() => setShowTextOverlays((prev) => !prev)}
                className="flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#001ec0]">
                  <VideoCamera size={16} weight="fill" />
                  <span>
                    GEMINI AI READ {result.text_overlays.length} TEXT OVERLAYS ON-SCREEN:
                  </span>
                </div>
                <button type="button" className="text-[#001ec0] font-mono text-xs font-bold flex items-center gap-1">
                  <span>{showTextOverlays ? "Hide" : "Show"}</span>
                  {showTextOverlays ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />}
                </button>
              </div>

              {showTextOverlays && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#001ec0]/20">
                  {result.text_overlays.map((overlay, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-white border border-[#001ec0]/30 font-mono text-xs text-[#1a130e] font-semibold"
                    >
                      &ldquo;{overlay}&rdquo;
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Machine Lever Selector */}
          <div className="bg-[#fef8f4] border-2 border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#1a130e]">
                MY COFFEE LEVER:
              </span>
              <span className="font-mono text-xs text-[#7f756f]">
                (Updates ratios and steps live)
              </span>
            </div>
            <div className="inline-flex border-2 border-black bg-white self-start sm:self-auto">
              {(["cometeer", "nespresso", "instant"] as Channel[]).map((ch) => {
                const isCurrent = activeChannel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => handleChannelChange(ch)}
                    className={`px-4 py-1.5 font-mono text-xs font-bold uppercase transition-colors cursor-pointer ${
                      isCurrent
                        ? "bg-[#1a130e] text-[#b8f600]"
                        : "text-[#1a130e] hover:bg-[#f3ede9]"
                    }`}
                  >
                    {CHANNEL_LABELS[ch]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Translation Superpowers Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Superpower 1: Hardware Brew Math */}
            <div className="bg-white p-6 border-2 border-black shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#1a130e] text-[#b8f600] uppercase">
                  SUPERPOWER 1
                </span>
                <Coffee size={22} weight="fill" className="text-[#001ec0]" />
              </div>
              <h3 className="font-syne text-xl font-bold text-[#1a130e]">
                Hardware Brew Math
              </h3>
              <div className="flex flex-col gap-2.5 font-mono text-xs text-[#4d4540]">
                <div className="p-2.5 bg-[#fef8f4] border border-[#1a130e]/15">
                  <span className="block font-bold text-[#1a130e] mb-1">
                    {activeChannel === "cometeer"
                      ? "COMETEER CONCENTRATE:"
                      : activeChannel === "nespresso"
                      ? "NESPRESSO VERTUO PULL:"
                      : "INSTANT BLOOM:"}
                  </span>
                  <p className="leading-relaxed">
                    {activeChannel === "cometeer"
                      ? result.superpowers.hardware_brew_math.cometeer.summary
                      : activeChannel === "nespresso"
                      ? result.superpowers.hardware_brew_math.nespresso.summary
                      : result.superpowers.hardware_brew_math.instant.summary}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#7f756f] uppercase font-bold">Tested Recommendation:</span>
                  <span className="font-bold text-[#001ec0]">
                    {activeChannel === "cometeer"
                      ? result.superpowers.hardware_brew_math.cometeer.recommendation
                      : activeChannel === "nespresso"
                      ? result.superpowers.hardware_brew_math.nespresso.pod_pick
                      : result.superpowers.hardware_brew_math.instant.bloom_note}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#7f756f] uppercase font-bold">Calibrated Ratio:</span>
                  <span className="font-bold text-[#1a130e]">
                    {activeChannel === "cometeer"
                      ? result.superpowers.hardware_brew_math.cometeer.ratio
                      : activeChannel === "nespresso"
                      ? result.superpowers.hardware_brew_math.nespresso.ratio
                      : result.superpowers.hardware_brew_math.instant.ratio}
                  </span>
                </div>
              </div>
            </div>

            {/* Superpower 2: Nutritional Reality Check */}
            <div className="bg-white p-6 border-2 border-black shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#001ec0] text-white uppercase">
                  SUPERPOWER 2
                </span>
                <Lightning size={22} weight="fill" className="text-[#001ec0]" />
              </div>
              <h3 className="font-syne text-xl font-bold text-[#1a130e]">
                Nutritional Reality Check
              </h3>
              {activeMacros && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-[#fef8f4] border border-[#1a130e]/15 flex flex-col">
                    <span className="font-mono text-[10px] text-[#7f756f] uppercase font-bold">CALORIES</span>
                    <span className="font-syne text-2xl font-extrabold text-[#1a130e]">
                      {activeMacros.calories}
                    </span>
                    <span className="font-mono text-[10px] text-[#7f756f]">kcal</span>
                  </div>

                  <div className="p-3 bg-[#fef8f4] border border-[#1a130e]/15 flex flex-col">
                    <span className="font-mono text-[10px] text-[#7f756f] uppercase font-bold">SUGAR</span>
                    <span className="font-syne text-2xl font-extrabold text-[#ba1a1a]">
                      {activeMacros.sugar_g}g
                    </span>
                    <span className="font-mono text-[10px] text-[#ba1a1a] font-bold">
                      {Math.round(activeMacros.sugar_g / 4)} tsp sugar
                    </span>
                  </div>

                  <div className="p-3 bg-[#fef8f4] border border-[#1a130e]/15 flex flex-col">
                    <span className="font-mono text-[10px] text-[#7f756f] uppercase font-bold">CAFFEINE</span>
                    <span className="font-syne text-2xl font-extrabold text-[#001ec0]">
                      {activeMacros.caffeine_mg}mg
                    </span>
                    <span className="font-mono text-[10px] text-[#001ec0] font-bold">
                      ~{(activeMacros.caffeine_mg / 95).toFixed(1)} cups coffee
                    </span>
                  </div>

                  <div className="p-3 bg-[#fef8f4] border border-[#1a130e]/15 flex flex-col">
                    <span className="font-mono text-[10px] text-[#7f756f] uppercase font-bold">PROTEIN</span>
                    <span className="font-syne text-2xl font-extrabold text-[#1a130e]">
                      {activeMacros.protein_g}g
                    </span>
                    <span className="font-mono text-[10px] text-[#7f756f]">
                      Fat: {activeMacros.fat_g}g
                    </span>
                  </div>
                </div>
              )}
              <p className="font-body text-xs text-[#7f756f] italic">
                Viral videos ignore syrups and creamer macros. StickyMilk benchmarks actual nutrition facts for honest energy tracking.
              </p>
            </div>

            {/* Superpower 3: Kitchen Mise en Place */}
            <div className="bg-white p-6 border-2 border-black shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#b8f600] text-[#141f00] uppercase">
                  SUPERPOWER 3
                </span>
                <Thermometer size={22} weight="bold" className="text-[#141f00]" />
              </div>
              <h3 className="font-syne text-xl font-bold text-[#1a130e]">
                Kitchen Mise en Place
              </h3>
              <div className="flex flex-col gap-2 font-mono text-xs">
                {result.superpowers.mise_en_place.phases.map((ph) => (
                  <div key={ph.phaseNumber} className="p-2.5 bg-[#fef8f4] border border-[#1a130e]/15 flex flex-col gap-1">
                    <span className="font-bold text-[#1a130e]">
                      Phase {ph.phaseNumber}: {ph.name}
                    </span>
                    <p className="text-[#4d4540] text-[11px] leading-snug">
                      {ph.steps.join(" ")}
                    </p>
                  </div>
                ))}
              </div>
              <p className="font-body text-xs text-[#7f756f] italic">
                Sequenced with temperature physics: cold foam whipped first, espresso pulled over ice last so the ice never melts prematurely.
              </p>
            </div>
          </div>

          {/* Calibrated Ingredients Breakdown */}
          <div className="bg-white p-6 sm:p-8 border-2 border-black shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex flex-col">
                <h3 className="font-syne text-2xl font-bold text-[#1a130e]">
                  Calibrated Ingredients & Sub-Assemblies
                </h3>
                <span className="font-mono text-xs text-[#7f756f]">
                  Channel: <strong>{CHANNEL_LABELS[activeChannel]}</strong>
                </span>
              </div>
              <span className="font-mono text-[11px] px-2 py-1 bg-[#fef8f4] border border-[#1a130e]/20 font-bold text-[#1a130e]">
                {activePrep?.ingredients.length} INGREDIENT LINES
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-black bg-[#fef8f4]">
                    <th className="py-2.5 px-3 uppercase text-[#7f756f]">Amount</th>
                    <th className="py-2.5 px-3 uppercase text-[#7f756f]">Item</th>
                    <th className="py-2.5 px-3 uppercase text-[#7f756f]">Group / Component</th>
                    <th className="py-2.5 px-3 uppercase text-[#7f756f]">Taxonomy Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a130e]/10">
                  {activePrep?.ingredients.map((ing, i) => {
                    const match = result.taxonomy_matches.find(
                      (m) => m.raw_item.toLowerCase() === ing.item.toLowerCase()
                    );
                    const isNovel = match ? match.is_novel : !ing.item_id;

                    return (
                      <tr key={i} className="hover:bg-[#fef8f4]/60">
                        <td className="py-2.5 px-3 font-bold text-[#1a130e] whitespace-nowrap">
                          {ing.amount != null ? ing.amount : ""} {ing.unit || ""}
                          {ing.secondary_amount != null && (
                            <span className="text-[#7f756f] font-normal ml-1">
                              ({ing.secondary_amount} {ing.secondary_unit})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#1a130e]">
                          {ing.item}
                          {ing.optional && (
                            <span className="ml-2 font-mono text-[10px] text-[#7f756f] uppercase">
                              (optional)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#4d4540]">
                          <span className="px-2 py-0.5 bg-[#f3ede9] text-[#1a130e] font-bold">
                            {ing.group || "Latte Base"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isNovel ? (
                            <span className="px-2 py-0.5 bg-[#fff3e0] text-[#e65100] font-bold border border-[#ffe0b2]">
                              NOVEL INGREDIENT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-[#e8f5e9] text-[#2e7d32] font-bold border border-[#c8e6c9]">
                              ✓ {ing.item_id}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Staged Kitchen Preparation Steps */}
          <div className="bg-white p-6 sm:p-8 border-2 border-black shadow-sm flex flex-col gap-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-syne text-2xl font-bold text-[#1a130e]">
                Foolproof Kitchen Instructions
              </h3>
              <span className="font-mono text-xs px-2 py-1 bg-[#1a130e] text-[#b8f600] font-bold uppercase">
                {CHANNEL_LABELS[activeChannel]} PROTOCOL
              </span>
            </div>

            <div className="flex flex-col gap-3 font-mono text-xs sm:text-sm text-[#1a130e]">
              {activePrep?.steps.map((step, idx) => {
                const isPhaseHeader = step.startsWith("## ");
                if (isPhaseHeader) {
                  return (
                    <div
                      key={idx}
                      className="mt-3 pt-2 border-t-2 border-[#1a130e]/15 font-syne text-base font-extrabold text-[#001ec0] uppercase tracking-wide"
                    >
                      {step.replace("## ", "")}
                    </div>
                  );
                }
                return (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-[#fef8f4] border border-[#1a130e]/15">
                    <span className="w-5 h-5 bg-[#1a130e] text-[#b8f600] font-bold flex items-center justify-center shrink-0 text-xs">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed text-[#1a130e]">{step}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
