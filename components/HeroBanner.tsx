import React from "react";

interface HeroBannerProps {
  totalCount: number;
  avgDuration: string;
  condensedRatio?: string;
}

export function HeroBanner({
  totalCount,
  avgDuration,
  condensedRatio = "1:2.5 Target",
}: HeroBannerProps) {
  return (
    <section className="relative w-full overflow-hidden bg-[#1a130e] text-white p-6 sm:p-10 lg:p-12 mb-8 shadow-xl border border-[#1a130e]">
      {/* Abstract Background Matrix Art */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-25 pointer-events-none hidden lg:block overflow-hidden">
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="200"
            cy="200"
            r="180"
            stroke="#b8f600"
            strokeDasharray="4 8"
            strokeWidth="1.5"
            opacity="0.4"
          />
          <path
            d="M50 200 C 120 100, 280 300, 350 200"
            stroke="#001ec0"
            strokeWidth="3.5"
            opacity="0.8"
          />
          <circle cx="200" cy="200" r="110" fill="#221a15" />
          <circle
            cx="200"
            cy="200"
            r="60"
            stroke="#b8f600"
            strokeWidth="1"
            opacity="0.3"
          />
          <line
            x1="200"
            y1="20"
            x2="200"
            y2="380"
            stroke="#d1c4bd"
            strokeDasharray="2 4"
            opacity="0.2"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-4xl flex flex-col gap-5">
        {/* Protocol tag line */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest px-2 py-1 bg-[#b8f600] text-[#141f00]">
            PROTOCOL S-01
          </span>
          <span className="font-mono text-xs uppercase tracking-wider text-[#d1c4bd]">
            EXTRACTION MATRIX // CONDENSED DYNAMICS
          </span>
        </div>

        {/* Hero title & text */}
        <div className="flex flex-col gap-2">
          <h1 className="font-syne text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white max-w-3xl leading-[1.1]">
            Slow drip, silky swirl, cold velvet.
          </h1>
          <p className="font-body text-base sm:text-lg text-[#d2c4bb] max-w-2xl leading-relaxed">
            Vietnamese &amp; condensed milk formulas re-engineered across three accelerated methods. Precise density ratios, zero phin waiting times, hyper-viscous mouthfeel.
          </p>
        </div>

        {/* Quick Metrics Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 max-w-2xl">
          <div className="flex flex-col p-3 bg-[#221a15] border border-white/5">
            <span className="font-mono text-[11px] text-[#d1c4bd] uppercase tracking-wider">
              Archive Index
            </span>
            <span className="font-syne text-2xl font-bold text-white mt-0.5">
              {totalCount} Formats
            </span>
          </div>

          <div className="flex flex-col p-3 bg-[#221a15] border border-white/5">
            <span className="font-mono text-[11px] text-[#d1c4bd] uppercase tracking-wider">
              Hardware
            </span>
            <span className="font-syne text-2xl font-bold text-[#b8f600] mt-0.5">
              Zero Phin
            </span>
          </div>

          <div className="flex flex-col p-3 bg-[#221a15] border border-white/5">
            <span className="font-mono text-[11px] text-[#d1c4bd] uppercase tracking-wider">
              Avg Duration
            </span>
            <span className="font-syne text-2xl font-bold text-white mt-0.5">
              {avgDuration}
            </span>
          </div>

          <div className="flex flex-col p-3 bg-[#221a15] border border-white/5">
            <span className="font-mono text-[11px] text-[#d1c4bd] uppercase tracking-wider">
              Condensed Ratio
            </span>
            <span className="font-syne text-2xl font-bold text-[#dfe0ff] mt-0.5">
              {condensedRatio}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
