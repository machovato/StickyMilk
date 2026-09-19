"use client";

import type { Channel } from "@/lib/types";
import { CHANNEL_LABELS } from "@/lib/types";

const CHANNELS: Channel[] = ["cometeer", "nespresso", "instant"];

export function ChannelToggle({
  value,
  onChange,
}: {
  value: Channel;
  onChange: (channel: Channel) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-cream-deep p-1 dark:border-border-dark dark:bg-ink-soft">
      {CHANNELS.map((channel) => {
        const active = channel === value;
        return (
          <button
            key={channel}
            type="button"
            onClick={() => onChange(channel)}
            aria-pressed={active}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-ink text-cream dark:bg-gold dark:text-ink"
                : "text-ink-muted hover:text-ink dark:text-cream/60 dark:hover:text-cream"
            }`}
          >
            {CHANNEL_LABELS[channel]}
          </button>
        );
      })}
    </div>
  );
}
