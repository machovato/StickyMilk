"use client";

import { useState, useTransition } from "react";
import { Star } from "@phosphor-icons/react";
import { setCurrentObsessionAction } from "@/lib/actions/site-settings";

/**
 * Edit-page button that features this recipe in the homepage hero.
 * There is always exactly one Current Obsession, so there's no "off" switch:
 * to change it, make a different recipe the obsession.
 */
export function ObsessionToggle({ slug, isCurrent: initial }: { slug: string; isCurrent: boolean }) {
  const [isCurrent, setIsCurrent] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (isCurrent) {
    return (
      <span className="self-start px-3 py-2 bg-[#b8f600] text-[#141f00] font-mono text-xs font-extrabold uppercase border border-black flex items-center gap-1.5">
        <Star size={14} weight="fill" />
        Current Obsession (on the homepage)
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1 self-start">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await setCurrentObsessionAction(slug);
            if (res.success) setIsCurrent(true);
            else setError(res.error);
          })
        }
        className="px-3 py-2 bg-white hover:bg-[#b8f600] text-[#1a130e] font-mono text-xs font-bold uppercase border border-[#1a130e] flex items-center gap-1.5 disabled:opacity-50"
      >
        <Star size={14} weight="bold" />
        {pending ? "Featuring…" : "Make Current Obsession"}
      </button>
      {error && <span className="font-mono text-[11px] text-[#ba1a1a]">{error}</span>}
    </div>
  );
}
