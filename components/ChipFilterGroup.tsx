"use client";

/**
 * One faceted filter row: a label plus a set of toggleable chips. Multiple
 * chips within a group are OR'd together (e.g. "easy" or "medium"); the
 * RecipeLibrary that composes several of these ANDs across groups.
 */
export function ChipFilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-muted dark:text-cream/50">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const active = selected.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              aria-pressed={active}
              className={`px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                active
                  ? "bg-ink font-bold text-cream dark:bg-gold dark:text-ink"
                  : "bg-cream text-ink-muted hover:bg-cream-deep dark:bg-ink dark:text-cream/70 dark:hover:bg-ink-soft"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
