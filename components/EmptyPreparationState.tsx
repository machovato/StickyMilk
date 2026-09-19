import { Flask } from "@phosphor-icons/react/dist/ssr";
import type { Channel, Recipe } from "@/lib/types";
import { CHANNEL_LABELS } from "@/lib/types";

const CHANNEL_FOUNDATION: Record<Channel, string> = {
  cometeer: "flash-frozen brewed coffee",
  nespresso: "high-bar espresso",
  instant: "freeze-dried soluble concentrate",
};

export function EmptyPreparationState({
  recipe,
  channel,
  onSwitch,
}: {
  recipe: Recipe;
  channel: Channel;
  onSwitch: (channel: Channel) => void;
}) {
  const available = recipe.preparations.map((p) => p.channel);

  return (
    <div className="p-8 bg-white border border-dashed border-[#1a130e]/20 text-left flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Flask size={20} weight="bold" className="text-[#7f756f]" />
        <h3 className="font-syne text-base font-bold text-[#1a130e] uppercase tracking-wide">
          {CHANNEL_LABELS[channel]} Version Not Available Yet
        </h3>
      </div>
      <p className="font-body text-sm text-[#4d4540]">
        This recipe hasn&apos;t been adapted for {CHANNEL_FOUNDATION[channel]} yet.
      </p>
      {available.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-[#7f756f] uppercase">
            Available Channels:
          </span>
          {available.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onSwitch(c)}
              className="px-3 py-1 bg-[#1a130e] text-white hover:bg-[#001ec0] font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
            >
              {CHANNEL_LABELS[c]} →
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
