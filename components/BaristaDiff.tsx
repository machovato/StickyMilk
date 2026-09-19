import type { Channel } from "@/lib/types";
import { CHANNEL_LABELS } from "@/lib/types";
import { BARISTA_DIFF } from "@/lib/barista-diff";

export function BaristaDiff({ channel }: { channel: Channel }) {
  const entry = BARISTA_DIFF[channel];
  return (
    <section className="p-5 bg-white border border-[#1a130e]/15">
      <div className="flex items-center justify-between pb-3 border-b border-[#1a130e]/10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#b8f600] border border-[#1a130e]/20" />
          <h2 className="font-syne text-sm font-bold uppercase tracking-wider text-[#1a130e]">
            How It Translates // {CHANNEL_LABELS[channel].toUpperCase()}
          </h2>
        </div>
        <span className="font-mono text-[10px] uppercase font-bold text-[#001ec0] bg-[#dfe0ff] px-2 py-0.5">
          Channel Guide
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="p-3 bg-[#f8f2ee] border border-[#1a130e]/10">
          <dt className="font-mono text-[11px] font-bold uppercase text-[#4d4540]">
            Method Flow
          </dt>
          <dd className="mt-1 font-syne text-sm font-bold text-[#1a130e]">
            {entry.methodFlow}
          </dd>
        </div>

        <div className="p-3 bg-[#f8f2ee] border border-[#1a130e]/10">
          <dt className="font-mono text-[11px] font-bold uppercase text-[#4d4540]">
            Coffee Base
          </dt>
          <dd className="mt-1 font-syne text-sm font-bold text-[#1a130e]">
            {entry.coffeeBase}
          </dd>
        </div>
      </dl>

      <p className="mt-3 font-body text-xs sm:text-sm leading-relaxed text-[#4d4540]">
        {entry.reason}
      </p>
    </section>
  );
}
