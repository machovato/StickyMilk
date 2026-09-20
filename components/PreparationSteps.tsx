"use client";

import { useState } from "react";
import { extractStepVerb } from "@/lib/step-verbs";

export function PreparationSteps({ steps }: { steps: string[] }) {
  const [activeStep, setActiveStep] = useState<number>(0);

  // Track the actual numbered steps (skipping phase divider headers)
  let stepIndex = 0;

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        // Phase section header (e.g. "## Phase 1: Cookie Butter Cloud Foam")
        if (step.startsWith("## ")) {
          const header = step.replace(/^##\s*/, "");
          return (
            <div
              key={i}
              className="pt-3 pb-1 border-b-2 border-[#1a130e]/20 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#001ec0]" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#001ec0]">
                  {header}
                </h3>
              </div>
              <span className="font-mono text-[10px] text-[#7f756f] uppercase font-bold">
                Workflow Phase
              </span>
            </div>
          );
        }

        const currentStepNumber = ++stepIndex;
        const isActive = activeStep === i;
        const verb = extractStepVerb(step);

        return (
          <div
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
                  {String(currentStepNumber).padStart(2, "0")}
                </span>
                <span className="font-mono text-xs font-bold uppercase text-[#001ec0] tracking-wider">
                  {verb}
                </span>
              </div>
              <span className="font-mono text-[10px] text-[#7f756f] uppercase">
                Step {currentStepNumber}
              </span>
            </div>

            <p className="font-body text-sm text-[#1d1b19] leading-relaxed pl-8">
              {step}
            </p>
          </div>
        );
      })}
    </div>
  );
}
