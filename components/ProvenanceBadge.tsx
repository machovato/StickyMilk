import type { ProvenanceStatus } from "@/lib/types";
import { PROVENANCE_LABELS } from "@/lib/types";

interface ProvenanceBadgeProps {
  provenance?: ProvenanceStatus;
  size?: "xs" | "sm" | "md";
  className?: string;
  showIcon?: boolean;
}

export function ProvenanceBadge({
  provenance = "adapted",
  size = "sm",
  className = "",
  showIcon = true,
}: ProvenanceBadgeProps) {
  const sizeClasses = {
    xs: "text-[9px] px-1.5 py-0.2 tracking-wider",
    sm: "text-[10px] px-2 py-0.5 tracking-wider",
    md: "text-xs px-2.5 py-1 tracking-widest",
  }[size];

  if (provenance === "tested") {
    return (
      <span
        title="Formally brewed, tasted, and approved by StickyMilk"
        className={`inline-flex items-center gap-1 font-mono font-bold uppercase bg-[#1a130e] text-[#b8f600] border border-[#b8f600]/40 shadow-xs ${sizeClasses} ${className}`}
      >
        {showIcon && <span className="text-xs leading-none" aria-hidden="true">⬡</span>}
        <span>SM TESTED</span>
      </span>
    );
  }

  if (provenance === "original") {
    return (
      <span
        title="Baseline formulation developed by the original source"
        className={`inline-flex items-center gap-1 font-mono font-bold uppercase bg-[#dfe0ff] text-[#001ec0] border border-[#001ec0]/25 shadow-xs ${sizeClasses} ${className}`}
      >
        {showIcon && <span className="text-[10px] leading-none" aria-hidden="true">★</span>}
        <span>ORIGINAL RECIPE</span>
      </span>
    );
  }

  // Default: adapted
  return (
    <span
      title="StickyMilk's calculated channel conversion"
      className={`inline-flex items-center gap-1 font-mono font-semibold uppercase bg-[#f3ede9] text-[#4d4540] border border-[#1a130e]/15 shadow-xs ${sizeClasses} ${className}`}
    >
      <span>SM ADAPTED</span>
    </span>
  );
}
