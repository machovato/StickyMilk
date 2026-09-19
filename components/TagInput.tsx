"use client";

import { useState } from "react";

/** Free-text chip list — used for recipe tags and per-preparation
 *  equipment. Deliberately not a fixed vocabulary (per the spec: 14
 *  recipes isn't enough data yet to know the right fixed taxonomy). */
export function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft("");
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-white px-2 py-0.5 text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              aria-label={`Remove ${v}`}
              className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-100"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={placeholder}
          className="min-h-[36px] flex-1 rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900"
        />
        <button
          type="button"
          onClick={commit}
          className="min-h-[36px] rounded-md border border-stone-300 px-3 text-sm text-stone-600 hover:border-stone-400 dark:border-stone-700 dark:text-stone-300"
        >
          Add
        </button>
      </div>
    </div>
  );
}
