"use client";

import { useState, useTransition } from "react";
import { Camera, CheckCircle, Sparkle, Warning } from "@phosphor-icons/react";
import {
  generateRecipePhotosAction,
  saveRecipePhotoAction,
  type PhotoCandidate,
} from "@/lib/actions/recipe-photo";

/**
 * Admin-only photo studio on the recipe edit page: generate a few AI photo
 * candidates in the StickyMilk house style, pick one, save it. Each candidate
 * gets its own background staging. Style rules: content/brand/photo-style.json.
 */
export function PhotoStudio({
  slug,
  currentImage,
  imageSource,
}: {
  slug: string;
  currentImage?: string;
  imageSource?: "ai" | "photo" | "video_frame";
}) {
  const [candidates, setCandidates] = useState<PhotoCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const generate = () => {
    setError(null);
    startGenerating(async () => {
      const res = await generateRecipePhotosAction(slug, 2);
      if (res.success) {
        setCandidates(res.candidates);
        if (res.errors.length) setError(`Some renders failed: ${res.errors[0]}`);
      } else {
        setError(res.error);
      }
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

  return (
    <section className="mb-8 p-4 sm:p-5 border-2 border-[#1a130e] bg-white flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Camera size={20} weight="bold" />
          <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-[#1a130e]">Photo studio</h2>
          {imageSource && (
            <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-[#f3ede9] text-[#4d4540]">
              current: {imageSource === "ai" ? "AI photo" : imageSource === "video_frame" ? "video frame" : "real photo"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={isGenerating || savingIndex !== null}
          className="px-4 py-2.5 bg-[#001ec0] hover:bg-[#1a130e] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
        >
          <Sparkle size={16} weight="fill" />
          {isGenerating ? "Rendering… (up to a minute)" : candidates.length ? "Try again" : "Generate photos"}
        </button>
      </div>

      <p className="font-mono text-[11px] text-[#7f756f]">
        Home-kitchen house style, with fresh background staging on every render. Nothing is saved until you pick one.
        {currentImage && " Saving replaces the current image."}
      </p>

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
                disabled={savingIndex !== null}
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
