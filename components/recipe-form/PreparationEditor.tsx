"use client";

import type { Channel, DietaryTag } from "@/lib/types";
import { CHANNEL_LABELS, DIETARY_LABELS } from "@/lib/types";
import type { FieldError } from "@/lib/recipe-schema";
import type { IngredientTaxonomyEntry } from "@/lib/taxonomy";
import {
  emptyIngredientDraft,
  emptyStepDraft,
  fieldMessage,
  type IngredientDraft,
  type PreparationDraft,
  type StepDraft,
} from "@/lib/recipe-draft";
import { IngredientRowEditor } from "./IngredientRowEditor";
import { TagInput } from "@/components/TagInput";

const DIETARY_ORDER = Object.keys(DIETARY_LABELS) as DietaryTag[];

function FieldErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 font-mono text-xs font-bold text-[#ba1a1a]">
      {message}
    </p>
  );
}

export function PreparationEditor({
  channel,
  prep,
  collapsed,
  onToggleCollapsed,
  onChange,
  onDisable,
  errors,
  cometeerIngredients,
  disabledChannels,
  onDuplicateTo,
  ingredientTaxonomy,
}: {
  channel: Channel;
  prep: PreparationDraft;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onChange: (patch: Partial<PreparationDraft>) => void;
  onDisable: () => void;
  errors: FieldError[];
  cometeerIngredients?: IngredientDraft[];
  disabledChannels: Channel[];
  onDuplicateTo: (target: Channel) => void;
  ingredientTaxonomy: IngredientTaxonomyEntry[];
}) {
  const unitListId = `unit-suggestions-${channel}`;
  const itemListId = `ingredient-suggestions-${channel}`;

  function updateIngredient(i: number, patch: Partial<IngredientDraft>) {
    const next = prep.ingredients.slice();
    next[i] = { ...next[i], ...patch };
    onChange({ ingredients: next });
  }
  function removeIngredient(i: number) {
    const next = prep.ingredients.filter((_, idx) => idx !== i);
    onChange({
      ingredients: next.length > 0 ? next : [emptyIngredientDraft()],
    });
  }
  function moveIngredient(i: number, dir: -1 | 1) {
    const next = prep.ingredients.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ingredients: next });
  }

  function updateStep(i: number, text: string) {
    const next = prep.steps.slice();
    next[i] = { ...next[i], text };
    onChange({ steps: next });
  }
  function removeStep(i: number) {
    const next = prep.steps.filter((_, idx) => idx !== i);
    onChange({ steps: next.length > 0 ? next : [emptyStepDraft()] });
  }
  function moveStep(i: number, dir: -1 | 1) {
    const next: StepDraft[] = prep.steps.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ steps: next });
  }

  return (
    <div className="border-2 border-[#1a130e] bg-white shadow-sm overflow-hidden text-left">
      {/* Accordion Header */}
      <div className="flex items-center justify-between gap-3 bg-[#1a130e] text-white px-4 py-3 border-b border-white/10">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex items-center gap-2 text-left cursor-pointer flex-1"
        >
          <span className="font-mono text-sm text-[#b8f600]">
            {collapsed ? "▶" : "▼"}
          </span>
          <span className="font-syne text-sm sm:text-base font-bold uppercase tracking-wider text-white">
            {CHANNEL_LABELS[channel]} Protocol
          </span>
          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-[#b8f600] text-[#141f00] ml-2">
            Active
          </span>
        </button>
        <button
          type="button"
          onClick={onDisable}
          className="font-mono text-xs uppercase text-[#d1c4bd] hover:text-[#ba1a1a] transition-colors cursor-pointer"
        >
          Remove Channel
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 sm:p-6 flex flex-col gap-6">
          {cometeerIngredients && cometeerIngredients.length > 0 && (
            <div className="p-3 bg-[#dfe0ff] border border-[#001ec0]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono text-xs font-bold uppercase text-[#000a63] block">
                  Quick Clone Available
                </span>
                <p className="font-mono text-[11px] text-[#000a63]/80">
                  Copy base ratio from Cometeer and adjust the coffee extract for this channel.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ingredients: cometeerIngredients.map((ing) => ({
                      ...ing,
                      localId:
                        crypto.randomUUID?.() ?? `${ing.localId}-copy`,
                    })),
                  })
                }
                className="px-3 py-1.5 bg-[#000a63] text-white hover:bg-[#1a130e] font-mono text-xs uppercase font-bold transition-colors cursor-pointer flex-shrink-0"
              >
                Copy Ingredients
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
                Roast Recommendation{" "}
                <span className="font-normal text-[#7f756f]">(optional)</span>
              </label>
              <select
                value={prep.roast_recommendation}
                onChange={(e) =>
                  onChange({
                    roast_recommendation: e.target
                      .value as PreparationDraft["roast_recommendation"],
                  })
                }
                className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
              >
                <option value="">No recommendation</option>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="dark">Dark</option>
              </select>
              <p className="font-mono text-[10px] text-[#7f756f]">
                Only set when roast character affects condensed milk pairing.
              </p>
              <FieldErrorText
                message={fieldMessage(errors, "roast_recommendation")}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
                Tested With Product{" "}
                <span className="font-normal text-[#7f756f]">(craft citation)</span>
              </label>
              <input
                type="text"
                value={prep.tested_with}
                onChange={(e) => onChange({ tested_with: e.target.value })}
                placeholder="e.g. Intelligentsia Black Cat Classic Espresso"
                className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
              />
              <p className="font-mono text-[10px] text-[#7f756f]">
                A craft reference, not a mandatory brand requirement.
              </p>
            </div>
          </div>

          {prep.roast_recommendation !== "" && (
            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
                Roast Note{" "}
                <span className="font-normal text-[#ba1a1a]">
                  (required with recommendation)
                </span>
              </label>
              <input
                type="text"
                value={prep.roast_note}
                onChange={(e) => onChange({ roast_note: e.target.value })}
                placeholder="Why this roast family helps — specific sensory pairing rationale"
                className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
              />
              <FieldErrorText message={fieldMessage(errors, "roast_note")} />
            </div>
          )}

          {channel === "cometeer" && (
            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
                Capsule Count
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={prep.capsule_count}
                onChange={(e) => onChange({ capsule_count: e.target.value })}
                className="w-28 bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
              />
              <FieldErrorText message={fieldMessage(errors, "capsule_count")} />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
              Caffeine (mg total at 1x){" "}
              <span className="font-normal text-[#7f756f]">(optional)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={prep.caffeine_mg}
              onChange={(e) => onChange({ caffeine_mg: e.target.value })}
              placeholder="e.g. 180"
              className="w-28 bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            />
            <p className="font-mono text-[10px] text-[#7f756f]">
              Only specify if verified from official roaster data.
            </p>
            <FieldErrorText message={fieldMessage(errors, "caffeine_mg")} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
                Caffeine Level
              </label>
              <select
                value={prep.caffeine_level}
                onChange={(e) =>
                  onChange({
                    caffeine_level: e.target
                      .value as PreparationDraft["caffeine_level"],
                  })
                }
                className="bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
              >
                <option value="">Select…</option>
                <option value="full">Full</option>
                <option value="half">Half</option>
                <option value="decaf">Decaf</option>
              </select>
              <FieldErrorText
                message={fieldMessage(errors, "caffeine_level")}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
                Difficulty
              </label>
              <select
                value={prep.difficulty}
                onChange={(e) =>
                  onChange({
                    difficulty: e.target
                      .value as PreparationDraft["difficulty"],
                  })
                }
                className="bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
              >
                <option value="">Select…</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="advanced">Advanced</option>
              </select>
              <FieldErrorText message={fieldMessage(errors, "difficulty")} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
                Prep Time (min)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={prep.prep_time_minutes}
                onChange={(e) => onChange({ prep_time_minutes: e.target.value })}
                className="bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
              />
              <FieldErrorText
                message={fieldMessage(errors, "prep_time_minutes")}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
                Yield &amp; Unit
              </label>
              <div className="flex gap-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={prep.servings}
                  onChange={(e) => onChange({ servings: e.target.value })}
                  placeholder="1"
                  className="w-12 bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
                />
                <input
                  type="text"
                  value={prep.yield_unit}
                  onChange={(e) => onChange({ yield_unit: e.target.value })}
                  placeholder="serving"
                  className="flex-1 bg-[#f8f2ee] p-2 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
                />
              </div>
              <FieldErrorText message={fieldMessage(errors, "servings")} />
            </div>
          </div>

          {/* Dietary & Equipment */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
                Dietary Attributes
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {DIETARY_ORDER.map((tag) => {
                  const isChecked = prep.dietary.includes(tag);
                  return (
                    <label
                      key={tag}
                      className={`flex items-center gap-1.5 px-2.5 py-1 font-mono text-xs uppercase cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-[#001ec0] text-white font-bold"
                          : "bg-[#f3ede9] text-[#1d1b19] hover:bg-[#ede7e3]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          onChange({
                            dietary: e.target.checked
                              ? [...prep.dietary, tag]
                              : prep.dietary.filter((d) => d !== tag),
                          })
                        }
                        className="hidden"
                      />
                      <span>{DIETARY_LABELS[tag]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
                Required Equipment
              </label>
              <TagInput
                values={prep.equipment}
                onChange={(equipment) => onChange({ equipment })}
                placeholder="e.g. handheld frother, cocktail shaker"
              />
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#1a130e]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#001ec0]" />
                <h3 className="font-syne text-sm font-bold uppercase text-[#1a130e]">
                  Ingredients ({prep.ingredients.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ingredients: [
                      ...prep.ingredients,
                      emptyIngredientDraft(),
                    ],
                  })
                }
                className="px-3 py-1 bg-[#1a130e] hover:bg-[#001ec0] text-white font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
              >
                + Add Ingredient
              </button>
            </div>

            <datalist id={unitListId}>
              {[
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
              ].map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
            <datalist id={itemListId}>
              {ingredientTaxonomy.map((entry) => (
                <option key={entry.id} value={entry.name} />
              ))}
            </datalist>

            <div className="space-y-2 mt-2">
              {prep.ingredients.map((ing, i) => (
                <IngredientRowEditor
                  key={ing.localId}
                  ingredient={ing}
                  unitListId={unitListId}
                  itemListId={itemListId}
                  ingredientTaxonomy={ingredientTaxonomy}
                  onChange={(patch) => updateIngredient(i, patch)}
                  onRemove={() => removeIngredient(i)}
                  onMoveUp={i > 0 ? () => moveIngredient(i, -1) : undefined}
                  onMoveDown={
                    i < prep.ingredients.length - 1
                      ? () => moveIngredient(i, 1)
                      : undefined
                  }
                />
              ))}
            </div>
            <FieldErrorText message={fieldMessage(errors, "ingredients")} />
          </div>

          {/* Steps Section */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#1a130e]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#001ec0]" />
                <h3 className="font-syne text-sm font-bold uppercase text-[#1a130e]">
                  Procedure Stages ({prep.steps.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({ steps: [...prep.steps, emptyStepDraft()] })
                }
                className="px-3 py-1 bg-[#1a130e] hover:bg-[#001ec0] text-white font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
              >
                + Add Stage
              </button>
            </div>

            <ol className="space-y-2 mt-2">
              {prep.steps.map((step, i) => (
                <li
                  key={step.localId}
                  className="flex items-start gap-2 p-2 bg-[#f8f2ee] border border-[#1a130e]/10"
                >
                  <span className="font-syne font-bold text-xs bg-[#1a130e] text-white w-6 h-6 flex items-center justify-center flex-shrink-0 mt-1">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <textarea
                    value={step.text}
                    onChange={(e) => updateStep(i, e.target.value)}
                    rows={2}
                    placeholder="Describe this stage (e.g. Pour hot espresso directly over condensed milk and stir vigorously)..."
                    className="flex-1 bg-white p-2 font-body text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:outline-none"
                  />
                  <div className="flex flex-col gap-1">
                    {i > 0 && (
                      <button
                        type="button"
                        onClick={() => moveStep(i, -1)}
                        aria-label="Move step up"
                        className="w-6 h-6 bg-[#f3ede9] hover:bg-[#1a130e] hover:text-white font-mono text-xs flex items-center justify-center transition-colors cursor-pointer"
                      >
                        ↑
                      </button>
                    )}
                    {i < prep.steps.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveStep(i, 1)}
                        aria-label="Move step down"
                        className="w-6 h-6 bg-[#f3ede9] hover:bg-[#1a130e] hover:text-white font-mono text-xs flex items-center justify-center transition-colors cursor-pointer"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      aria-label="Remove step"
                      className="w-6 h-6 bg-[#ba1a1a] text-white font-mono text-xs flex items-center justify-center cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <FieldErrorText message={fieldMessage(errors, "steps")} />
          </div>

          {/* Duplicate to other channels */}
          {disabledChannels.length > 0 && (
            <div className="p-3 bg-[#f8f2ee] border border-[#1a130e]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="font-mono text-xs text-[#4d4540]">
                Duplicate this setup as starting draft for:
              </span>
              <div className="flex flex-wrap gap-2">
                {disabledChannels.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onDuplicateTo(c)}
                    className="px-2.5 py-1 bg-white hover:bg-[#001ec0] hover:text-white border border-[#1a130e]/20 font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
                  >
                    + {CHANNEL_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
