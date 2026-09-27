"use client";

import { useState, useTransition } from "react";
import { ArrowsClockwise, Camera, CheckCircle, Sparkle, Warning } from "@phosphor-icons/react";
import {
  generateRecipePhotosAction,
  regeneratePhotoBriefAction,
  saveRecipePhotoAction,
  type PhotoCandidate,
} from "@/lib/actions/recipe-photo";
import type { PhotoBrief } from "@/lib/types";

/**
 * Admin-only photo studio on the recipe edit page.
 * - Shows the current photo (or the stand-in, if the recipe has none).
 * - Generates AI photo candidates in the StickyMilk house style; each gets its
 *   own staging and composition. Nothing is saved until you pick one.
 * - Shows the art-director brief (how the drink is expected to look), with a
 *   button to rewrite it if it misjudged the drink.
 * - An optional one-off note ("put it in an 8-ball glass") steers a single
 *   render; it isn't saved.
 * Style rules: content/brand/photo-style.json. See PHOTOS.md.
 */
export function PhotoStudio({
  slug,
  currentImage,
  isStandIn,
  imageSource,
  brief: initialBrief,
}: {
  slug: string;
  /** The photo the recipe shows today (its own, or the generic stand-in) */
  currentImage?: string;
  /** True when currentImage is the generic stand-in, not this recipe's photo */
  isStandIn: boolean;
  imageSource?: "ai" | "photo" | "video_frame";
  brief?: PhotoBrief;
}) {
  const [candidates, setCandidates] = useState<PhotoCandidate[]>([]);
  const [brief, setBrief] = useState<PhotoBrief | undefined>(initialBrief);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [isBriefing, startBriefing] = useTransition();
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const busy = isGenerating || isBriefing || savingIndex !== null;

  const generate = () => {
    setError(null);
    startGenerating(async () => {
      const res = await generateRecipePhotosAction(slug, 2, note);
      if (res.success) {
        setCandidates(res.candidates);
        if (res.brief) setBrief(res.brief); // written on first render
        if (res.errors.length) setError(res.errors.join(" · "));
      } else {
        setError(res.error);
      }
    });
  };

  const rewriteBrief = () => {
    setError(null);
    startBriefing(async () => {
      const res = await regeneratePhotoBriefAction(slug);
      if (res.success) setBrief(res.brief);
      else setError(res.error);
    });
  };

  const save = async (i: number) => {
    setSavingIndex(i);
    setError(null);
    const res = await saveRecipePhotoAction(slug, candidates[i].jpegBase64);
    if (res.success) {
      // Full reload so the edit form below picks up the new image path
      // (otherwise saving the form would put the old image back)
      window.location.reload();
    } else {
      setError(res.error);
      setSavingIndex(null);
    }
  };

  const sourceLabel = isStandIn
    ? "stand-in (no photo yet)"
    : imageSource === "ai"
    ? "AI photo"
    : imageSource === "video_frame"
    ? "video frame"
    : imageSource === "photo"
    ? "real photo"
    : "photo";

  return (
    <section className="mb-8 p-4 sm:p-5 border-2 border-[#1a130e] bg-white flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Camera size={20} weight="bold" />
        <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-[#1a130e]">Photo studio</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
        {/* Current photo */}
        <div className="flex flex-col gap-1.5">
          {currentImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImage}
              alt="Current recipe photo"
              className={`w-full aspect-square object-cover border border-[#1a130e]/20 ${isStandIn ? "opacity-60" : ""}`}
            />
          ) : (
            <div className="w-full aspect-square bg-[#f3ede9] border border-dashed border-[#1a130e]/30 flex items-center justify-center font-mono text-[11px] text-[#7f756f]">
              No photo yet
            </div>
          )}
          <span className="font-mono text-[10px] font-bold uppercase text-[#4d4540]">Current: {sourceLabel}</span>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-3">
          <p className="font-mono text-[11px] text-[#7f756f]">
            Home-kitchen house style, with fresh staging and framing on every render. Nothing is saved until you pick
            one{currentImage && !isStandIn ? "; saving replaces the current photo" : ""}.
          </p>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[11px] font-bold uppercase text-[#1a130e]">
              Note for this render <span className="font-normal normal-case text-[#7f756f]">(optional, not saved)</span>
            </span>
            <input
              type="text"
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) {
                  e.preventDefault();
                  generate();
                }
              }}
              placeholder='e.g. "put it in a tall 8-ball glass" or "overhead shot"'
              className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="self-start px-4 py-2.5 bg-[#001ec0] hover:bg-[#1a130e] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkle size={16} weight="fill" />
            {isGenerating ? "Rendering… (up to a minute)" : candidates.length ? "Try again" : "Generate photos"}
          </button>

          {/* The art director's brief: how this drink is expected to look */}
          <div className="p-3 bg-[#f8f2ee] border border-[#1a130e]/10 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-bold uppercase text-[#1a130e]">Art director brief</span>
              <button
                type="button"
                onClick={rewriteBrief}
                disabled={busy}
                className="font-mono text-[10px] font-bold uppercase text-[#001ec0] hover:text-[#1a130e] flex items-center gap-1 disabled:opacity-50"
              >
                <ArrowsClockwise size={12} weight="bold" />
                {isBriefing ? "Rewriting…" : brief ? "Regenerate brief" : "Write brief now"}
              </button>
            </div>
            {brief ? (
              <dl className="font-mono text-[11px] text-[#4d4540] grid grid-cols-[90px_1fr] gap-x-2 gap-y-0.5">
                <dt className="text-[#7f756f]">Tell</dt>
                <dd>{brief.tell}</dd>
                <dt className="text-[#7f756f]">Glass</dt>
                <dd>{brief.vessel.replace(/_/g, " ")}</dd>
                <dt className="text-[#7f756f]">Colors</dt>
                <dd>{brief.colors}</dd>
                <dt className="text-[#7f756f]">Hero detail</dt>
                <dd>{brief.hero_detail}</dd>
                {brief.story_prop && (
                  <>
                    <dt className="text-[#7f756f]">Story prop</dt>
                    <dd>{brief.story_prop}</dd>
                  </>
                )}
                {brief.stages && (
                  <>
                    <dt className="text-[#7f756f]">Two looks</dt>
                    <dd>
                      Before: {brief.stages.before} After: {brief.stages.after}
                    </dd>
                  </>
                )}
              </dl>
            ) : (
              <p className="font-mono text-[11px] text-[#7f756f]">
                Written automatically on the first render: the drink&apos;s tell, glass, colors and hero detail.
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#ffebee] border border-[#ba1a1a] text-[#ba1a1a] font-mono text-xs flex items-start gap-2">
          <Warning size={16} weight="bold" className="flex-shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {candidates.map((c, i) => (
            <div key={i} className="flex flex-col gap-2 border border-[#1a130e]/20 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/jpeg;base64,${c.jpegBase64}`} alt={`Candidate ${i + 1}`} className="w-full aspect-square object-cover" />
              <button
                type="button"
                onClick={() => save(i)}
                disabled={busy}
                className="px-3 py-2 bg-[#b8f600] text-[#141f00] font-mono text-xs font-extrabold uppercase border border-black hover:bg-white disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={16} weight="bold" />
                {savingIndex === i ? "Saving…" : "Use this photo"}
              </button>
              {/* What this render asked for: useful when tuning photo-style.json */}
              <details className="font-mono text-[10px] text-[#7f756f]">
                <summary className="cursor-pointer">
                  {c.moment ?? "no special moment"} · {c.staging.length} props · {c.model}
                </summary>
                <pre className="mt-1 whitespace-pre-wrap">{c.prompt}</pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
