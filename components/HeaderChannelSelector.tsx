"use client";

import { usePathname } from "next/navigation";
import type { Channel } from "@/lib/types";
import { CHANNEL_LABELS } from "@/lib/types";
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
    hint: "Cometeer (26g frozen liquid extract puck)",
  },
  {
    id: "nespresso",
    label: "Nespresso",
    hint: "Nespresso Vertuo (Single & Double espresso pulls)",
  },
  {
    id: "instant",
    label: "Instant",
    hint: "Specialty Instant (Dissolved soluble concentrate)",
  },
];

export function HeaderChannelSelector() {
  const pathname = usePathname();
  const { defaultChannel, setDefaultChannel } = useChannel();

  const handleToggle = (id: Channel) => {
    if (defaultChannel === id) {
      setDefaultChannel(null);
    } else {
      setDefaultChannel(id);
    }
  };

  // On the homepage (/), the page itself prominently features the full MY COFFEE TODAY
  // declaration bar. To avoid duplicate controls in the viewport, the header only renders
  // a compact active-status pill if a system is selected, or stays clean if none is.
  if (pathname === "/") {
    if (!defaultChannel) return null;
    return (
      <div className="hidden sm:flex items-center gap-2 bg-[#1a130e] text-white px-3 py-1 border border-black shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-[#b8f600]" aria-hidden="true" />
        <span className="font-mono text-xs uppercase font-bold tracking-tight">
          {CHANNEL_LABELS[defaultChannel]} ACTIVE
        </span>
        <button
          type="button"
          onClick={() => setDefaultChannel(null)}
          title="Clear coffee selection"
          className="text-[#a89e97] hover:text-[#b8f600] font-mono text-xs ml-1 cursor-pointer"
        >
          [×]
        </button>
      </div>
    );
  }

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
              onClick={() => handleToggle(id)}
              title={
                active
                  ? `${label} active — click to show all recipes`
                  : hint
              }
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
