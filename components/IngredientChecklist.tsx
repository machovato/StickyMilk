"use client";

import { useState } from "react";
import type { Ingredient } from "@/lib/types";
import { formatIngredientAmount } from "@/lib/format-amount";

export function IngredientChecklist({
  ingredients,
  scale,
}: {
  ingredients: Ingredient[];
  /** Portion multiplier (0.5, 1, 2, 4) — affects displayed amounts, not check state. */
  scale: number;
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between pb-1 border-b border-[#1a130e]/10">
        <span className="font-mono text-xs font-bold uppercase text-[#001ec0]">
          {checked.size} of {ingredients.length} READY
        </span>
        {checked.size > 0 && (
          <button
            type="button"
            onClick={() => setChecked(new Set())}
            className="font-mono text-[11px] uppercase text-[#7f756f] hover:text-[#1a130e] transition-colors cursor-pointer"
          >
            Clear Checklist
          </button>
        )}
      </div>

      <ul className="space-y-1.5 pt-1">
        {ingredients.map((ing, i) => {
          const isChecked = checked.has(i);
          const amount =
            ing.amount != null
              ? formatIngredientAmount(
                  ing.amount * scale,
                  ing.unit,
                  ing.secondary_amount != null
                    ? ing.secondary_amount * scale
                    : undefined,
                  ing.secondary_unit
                )
              : null;

          return (
            <li key={i}>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-3 p-2 bg-white hover:bg-[#f8f2ee] border border-[#1a130e]/10 transition-colors">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(i)}
                  className="h-4 w-4 shrink-0 accent-[#001ec0] cursor-pointer"
                />
                <span
                  className={`font-body text-sm ${
                    isChecked
                      ? "text-[#7f756f] line-through"
                      : "text-[#1d1b19]"
                  }`}
                >
                  {amount && (
                    <span className="font-mono text-xs font-bold text-[#1a130e] bg-[#f3ede9] px-1.5 py-0.5 mr-1.5 inline-block">
                      {amount}
                    </span>
                  )}
                  <span className="font-medium">{ing.item}</span>
                  {ing.notes && (
                    <span className="font-mono text-xs text-[#7f756f] ml-1">
                      ({ing.notes})
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
