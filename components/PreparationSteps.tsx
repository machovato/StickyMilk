"use client";

import { useState } from "react";
import { extractStepVerb } from "@/lib/step-verbs";

export function PreparationSteps({ steps }: { steps: string[] }) {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <ol className="space-y-3">
      {steps.map((step, i) => {
        const isActive = activeStep === i;
        const verb = extractStepVerb(step);

        return (
          <li
            key={i}
            onClick={() => setActiveStep(i)}
            className={`p-4 border transition-all cursor-pointer ${
              isActive
                ? "border-[#001ec0] bg-[#dfe0ff]/20 shadow-sm"
                : "border-[#1a130e]/10 bg-white hover:border-[#1a130e]/30"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <span className="font-syne font-bold text-xs bg-[#1a130e] text-white w-6 h-6 flex items-center justify-center flex-shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-xs font-bold uppercase text-[#001ec0] tracking-wider">
                  {verb}
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#7f756f] uppercase">
                Stage {i + 1} of {steps.length}
              </span>
            </div>

            <p className="font-body text-sm text-[#1d1b19] leading-relaxed pl-8">
              {step}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
