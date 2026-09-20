"use client";

import type { Channel } from "@/lib/types";
import { useChannel } from "@/lib/channel-context";

interface ChannelOption {
  id: Channel;
  label: string;
  hint: string;
}

const CHANNELS: ChannelOption[] = [
  {
    id: "cometeer",
    label: "Cometeer",
    hint: "Cometeer Hyper-Melt (Frozen liquid extract puck)",
  },
  {
    id: "nespresso",
    label: "Nespresso",
    hint: "Nespresso High-Bar (Vertuo 40ml single & 80ml double shots)",
  },
  {
    id: "instant",
    label: "Instant",
    hint: "Soluble Concentrate (Freeze-dried crystals)",
  },
];

export function HeaderChannelSelector() {
  const { defaultChannel, setDefaultChannel } = useChannel();

  return (
    <div className="flex items-center bg-[#f3ede9] p-1 border border-[#1a130e]/15 shadow-sm">
      <span className="hidden sm:inline font-mono text-[10px] font-bold uppercase tracking-wider px-2 text-[#7f756f]">
        MY COFFEE:
      </span>
      <div className="flex items-center gap-1">
        {CHANNELS.map(({ id, label, hint }) => {
          const active = defaultChannel === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setDefaultChannel(id)}
              title={hint}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 font-mono text-xs uppercase font-bold tracking-tight transition-all cursor-pointer ${
                active
                  ? "bg-[#1a130e] text-white shadow-sm"
                  : "text-[#4d4540] hover:text-[#1a130e] hover:bg-[#ede7e3]"
              }`}
            >
              {active && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#b8f600]"
                  aria-hidden="true"
                />
              )}
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
