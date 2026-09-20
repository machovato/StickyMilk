import React from "react";
import { Star, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import type { TestKitchenReview, Channel } from "@/lib/types";
import { CHANNEL_LABELS } from "@/lib/types";

interface TestKitchenReviewCardProps {
  review: TestKitchenReview;
  activeChannel: Channel;
}

export function TestKitchenReviewCard({
  review,
  activeChannel,
}: TestKitchenReviewCardProps) {
  const channelScore = review.channel_scores?.[activeChannel] ?? review.score;
  const channelVerdict = review.channel_verdicts?.[activeChannel];

  return (
    <div className="w-full bg-[#1a130e] text-white p-5 sm:p-6 border-2 border-black shadow-md">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/15 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 bg-[#b8f600]" />
          <div>
            <h2 className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#b8f600]">
              STICKYMILK TEST KITCHEN // VERDICT
            </h2>
            <p className="font-mono text-[11px] text-[#a89e97]">
              Evaluated by {review.tester || "Tony Melendez"}
              {review.tested_date && ` on ${review.tested_date}`}
            </p>
          </div>
        </div>

        {/* 10-Point Score Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-[#221a15] px-3 py-1.5 border border-white/20">
          <Star size={18} weight="fill" className="text-[#b8f600]" />
          <div className="flex flex-col text-right leading-none">
            <span className="font-syne text-lg font-bold text-white">
              {channelScore.toFixed(1)}{" "}
              <span className="text-xs text-[#a89e97] font-mono">/ 10</span>
            </span>
            {review.channel_scores?.[activeChannel] != null && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#b8f600] mt-0.5">
                {CHANNEL_LABELS[activeChannel]} Score
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Punchy Verdict Quote */}
      <blockquote className="font-body text-base sm:text-lg text-white leading-relaxed italic border-l-2 border-[#b8f600] pl-4 my-3">
        &ldquo;{channelVerdict || review.verdict}&rdquo;
      </blockquote>

      {/* Extended Craft Notes if provided */}
      {review.notes && (
        <p className="font-body text-xs sm:text-sm text-[#d1c4bd] leading-relaxed mt-3 pt-3 border-t border-white/10">
          {review.notes}
        </p>
      )}

      {/* Hardware Translation Breakdown across all 3 Channels */}
      {review.channel_verdicts && Object.keys(review.channel_verdicts).length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#a89e97] block mb-2">
            HARDWARE TRANSLATION FIDELITY:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(["cometeer", "nespresso", "instant"] as Channel[]).map((c) => {
              const cVerdict = review.channel_verdicts?.[c];
              const cScore = review.channel_scores?.[c];
              const isActive = c === activeChannel;
              if (!cVerdict && cScore == null) return null;

              return (
                <div
                  key={c}
                  className={`p-2.5 border text-xs font-mono flex flex-col justify-between ${
                    isActive
                      ? "bg-[#2a201a] border-[#b8f600]"
                      : "bg-[#221a15] border-white/10 text-[#d1c4bd]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-bold uppercase ${
                        isActive ? "text-[#b8f600]" : "text-white"
                      }`}
                    >
                      {CHANNEL_LABELS[c]}
                    </span>
                    {cScore != null && (
                      <span className="text-[11px] font-bold text-[#b8f600]">
                        {cScore.toFixed(1)}/10
                      </span>
                    )}
                  </div>
                  {cVerdict && (
                    <p className="font-body text-[11px] text-[#d1c4bd] leading-tight mt-1">
                      {cVerdict}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trust Guarantee Badge */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#a89e97] uppercase">
        <div className="flex items-center gap-1.5 text-[#b8f600]">
          <ShieldCheck size={14} weight="bold" />
          <span>⬡ Physically Brewed & Evaluated In Kitchen</span>
        </div>
        <span>Zero Sponsored Bias</span>
      </div>
    </div>
  );
}
