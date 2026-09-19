"use client";

import type { IngredientDraft } from "@/lib/recipe-draft";
import type { IngredientTaxonomyEntry } from "@/lib/taxonomy";

function findTaxonomyMatch(
  item: string,
  taxonomy: IngredientTaxonomyEntry[]
): IngredientTaxonomyEntry | undefined {
  const needle = item.trim().toLowerCase();
  if (needle === "") return undefined;
  return taxonomy.find(
    (e) =>
      e.name.toLowerCase() === needle ||
      e.aliases.some((a) => a.toLowerCase() === needle)
  );
}

export const UNIT_SUGGESTIONS = [
  "oz",
  "fl oz",
  "tbsp",
  "tsp",
  "g",
  "ml",
  "cup",
  "capsule",
  "pod",
  "pinch",
  "scoop",
  "dash",
  "sprig",
  "count",
];

export function IngredientRowEditor({
  ingredient,
  unitListId,
  itemListId,
  ingredientTaxonomy,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  ingredient: IngredientDraft;
  unitListId: string;
  itemListId?: string;
  ingredientTaxonomy?: IngredientTaxonomyEntry[];
  onChange: (patch: Partial<IngredientDraft>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  function handleItemChange(value: string) {
    const match = ingredientTaxonomy
      ? findTaxonomyMatch(value, ingredientTaxonomy)
      : undefined;
    onChange({
      item: value,
      item_id: match?.id ?? "",
      ...(match?.default_unit && ingredient.unit.trim() === ""
        ? { unit: match.default_unit }
        : {}),
    });
  }

  return (
    <div className="border border-[#1a130e]/15 bg-white p-3 flex flex-col gap-2 shadow-xs">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[5rem_6rem_1fr]">
        <input
          type="text"
          inputMode="decimal"
          value={ingredient.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          placeholder="Amt"
          aria-label="Amount"
          className="bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
        />
        <input
          type="text"
          list={unitListId}
          value={ingredient.unit}
          onChange={(e) => onChange({ unit: e.target.value })}
          placeholder="Unit"
          aria-label="Unit"
          className="bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
        />
        <input
          type="text"
          list={itemListId}
          value={ingredient.item}
          onChange={(e) => handleItemChange(e.target.value)}
          placeholder="Ingredient name (required)"
          aria-label="Ingredient"
          className="col-span-2 sm:col-span-1 bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
        />
      </div>

      {ingredient.item_id && (
        <p className="font-mono text-[10px] text-[#001ec0]">
          TAXONOMY LINKED: <code className="font-bold">{ingredient.item_id}</code>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          value={ingredient.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Notes (optional, e.g. chilled, shaken)"
          aria-label="Notes"
          className="bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
        />
        <input
          type="text"
          value={ingredient.group}
          onChange={(e) => onChange({ group: e.target.value })}
          placeholder="Group (optional, e.g. For the topping)"
          aria-label="Group"
          className="bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={ingredient.secondary_amount}
          onChange={(e) => onChange({ secondary_amount: e.target.value })}
          placeholder="Secondary Amt (e.g. 26)"
          aria-label="Secondary amount"
          className="bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
        />
        <input
          type="text"
          value={ingredient.secondary_unit}
          onChange={(e) => onChange({ secondary_unit: e.target.value })}
          placeholder="Secondary Unit (e.g. g)"
          aria-label="Secondary unit"
          className="bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1a130e]/10">
        <label className="flex items-center gap-1.5 font-mono text-xs text-[#4d4540] cursor-pointer">
          <input
            type="checkbox"
            checked={ingredient.optional}
            onChange={(e) => onChange({ optional: e.target.checked })}
            className="accent-[#001ec0] w-3.5 h-3.5"
          />
          <span>Optional / If available</span>
        </label>

        <div className="flex items-center gap-1">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              aria-label="Move ingredient up"
              className="w-7 h-7 bg-[#f3ede9] hover:bg-[#1a130e] hover:text-white font-mono text-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              aria-label="Move ingredient down"
              className="w-7 h-7 bg-[#f3ede9] hover:bg-[#1a130e] hover:text-white font-mono text-xs flex items-center justify-center transition-colors cursor-pointer"
            >
              ↓
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove ingredient"
            className="px-2.5 py-1 bg-[#1a130e] hover:bg-[#ba1a1a] text-white font-mono text-[11px] uppercase font-bold transition-colors cursor-pointer"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
