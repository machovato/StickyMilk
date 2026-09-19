"use client";

import type { Channel, Recipe } from "@/lib/types";

const METHOD_COPY: Record<Channel, { label: string; subtitle: string }> = {
  cometeer: {
    label: "Cometeer Hyper-Melt",
    subtitle: "Frozen liquid coffee puck · Zero wait",
  },
  nespresso: {
    label: "Nespresso High-Bar",
    subtitle: "19-bar extraction · 40 ml shot",
  },
  instant: {
    label: "Soluble Concentrate",
    subtitle: "Freeze-dried soluble crystals · Pantry ready",
  },
};

const CHANNEL_ORDER: Channel[] = ["cometeer", "nespresso", "instant"];

export function MethodSelector({
  recipe,
  value,
  onChange,
}: {
  recipe: Recipe;
  value: Channel;
  onChange: (channel: Channel) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-[#001ec0]" />
        <h2 className="font-syne text-sm sm:text-base font-bold uppercase tracking-wider text-[#1a130e]">
          Select Extraction Channel
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CHANNEL_ORDER.map((channel) => {
          const available = recipe.preparations.some(
            (p) => p.channel === channel
          );
          const selected = value === channel;
          const { label, subtitle } = METHOD_COPY[channel];

          return (
            <button
              key={channel}
              type="button"
              onClick={() => onChange(channel)}
              aria-pressed={selected}
              className={`p-3.5 sm:p-4 text-left transition-all border cursor-pointer ${
                selected
                  ? "bg-[#001ec0] text-white border-[#001ec0] shadow-[0_2px_0_#1a130e]"
                  : "bg-white text-[#1d1b19] border-[#1a130e]/15 hover:border-[#1a130e]/40 hover:bg-[#f8f2ee]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-syne text-sm font-bold uppercase tracking-tight">
                  {label}
                </span>
                {!available && (
                  <span
                    className={`font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 ${
                      selected
                        ? "bg-white/20 text-white"
                        : "bg-[#f3ede9] text-[#7f756f]"
                    }`}
                  >
                    Draft
                  </span>
                )}
              </div>
              <p
                className={`mt-1 font-mono text-[11px] leading-tight ${
                  selected ? "text-white/80" : "text-[#4d4540]"
                }`}
              >
                {subtitle}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
