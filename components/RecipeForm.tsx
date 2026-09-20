"use client";

import { useActionState, useMemo, useState } from "react";
import type { Channel, Recipe } from "@/lib/types";
import { CHANNEL_LABELS, FORMAT_LABELS, SWEETNESS_LABELS } from "@/lib/types";
import {
  CHANNEL_ORDER,
  clonePreparationDraft,
  computeReadiness,
  draftToCandidate,
  emptyPreparationDraft,
  emptyRecipeDraft,
  errorsWithPrefix,
  fieldMessage,
  isReadyToSave,
  type PreparationDraft,
  type RecipeDraft,
  type RecipeSourceDraft,
} from "@/lib/recipe-draft";
import { validateRecipeCandidate } from "@/lib/recipe-schema";
import type { IngredientTaxonomyEntry } from "@/lib/taxonomy";
import { slugify } from "@/lib/slugify";
import { createRecipeAction } from "@/lib/actions/create-recipe";
import { updateRecipeAction } from "@/lib/actions/update-recipe";
import { initialCreateRecipeState } from "@/lib/create-recipe-state";
import { TagInput } from "@/components/TagInput";
import { PreparationEditor } from "@/components/recipe-form/PreparationEditor";
import { RecipeDetail } from "@/components/RecipeDetail";

function FieldErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 font-mono text-xs font-bold text-[#ba1a1a]">
      {message}
    </p>
  );
}

export function RecipeForm({
  existingSlugs,
  ingredientTaxonomy,
  initialDraft,
  mode = "create",
  originalSlug,
}: {
  existingSlugs: string[];
  ingredientTaxonomy: IngredientTaxonomyEntry[];
  initialDraft?: RecipeDraft;
  mode?: "create" | "edit";
  originalSlug?: string;
}) {
  const [draft, setDraft] = useState<RecipeDraft>(initialDraft ?? emptyRecipeDraft());
  const [collapsed, setCollapsed] = useState<Record<Channel, boolean>>({
    cometeer: false,
    nespresso: initialDraft ? !initialDraft.preparations.nespresso : true,
    instant: initialDraft ? !initialDraft.preparations.instant : true,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prevState: typeof initialCreateRecipeState) => {
      const formData = new FormData();
      formData.set("recipe", JSON.stringify(draftToCandidate(draft)));
      if (mode === "edit" && originalSlug) {
        return updateRecipeAction(originalSlug, _prevState, formData);
      }
      return createRecipeAction(_prevState, formData);
    },
    initialCreateRecipeState
  );

  const readiness = useMemo(() => computeReadiness(draft), [draft]);
  const readyToSave = useMemo(() => isReadyToSave(draft), [draft]);

  const slug = draft.slug.trim();
  const slugFormatValid =
    slug === "" || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  const slugTaken =
    slug !== "" &&
    (mode === "edit" ? slug !== originalSlug : true) &&
    existingSlugs.includes(slug);

  const previewRecipe = useMemo<Recipe | null>(() => {
    const candidate = draftToCandidate(draft);
    return validateRecipeCandidate(candidate).length === 0
      ? (candidate as Recipe)
      : null;
  }, [draft]);

  function updateName(name: string) {
    setDraft((d) => ({
      ...d,
      name,
      slug: d.slugTouched ? d.slug : slugify(name),
    }));
  }
  function updateSlug(value: string) {
    setDraft((d) => ({ ...d, slug: value, slugTouched: true }));
  }
  function updatePrep(channel: Channel, patch: Partial<PreparationDraft>) {
    setDraft((d) => {
      const current = d.preparations[channel];
      if (!current) return d;
      return {
        ...d,
        preparations: {
          ...d.preparations,
          [channel]: { ...current, ...patch },
        },
      };
    });
  }
  function enableChannel(channel: Channel, from?: PreparationDraft) {
    setDraft((d) => ({
      ...d,
      preparations: {
        ...d.preparations,
        [channel]: from
          ? clonePreparationDraft(from)
          : emptyPreparationDraft(),
      },
    }));
    setCollapsed((c) => ({ ...c, [channel]: false }));
  }
  function disableChannel(channel: Channel) {
    setDraft((d) => ({
      ...d,
      preparations: { ...d.preparations, [channel]: null },
    }));
  }

  const enabledChannels = CHANNEL_ORDER.filter(
    (c) => draft.preparations[c] !== null
  );
  const disabledChannelsFor = (channel: Channel) =>
    CHANNEL_ORDER.filter(
      (c) => c !== channel && draft.preparations[c] === null
    );

  const prepIndexByChannel = new Map<Channel, number>();
  enabledChannels.forEach((c, i) => prepIndexByChannel.set(c, i));

  return (
    <form action={formAction} className="flex flex-col gap-10">
      {state.errors.length > 0 && (
        <div className="p-4 bg-red-50 border-2 border-[#ba1a1a] text-[#ba1a1a] flex flex-col gap-2">
          <p className="font-mono text-xs font-bold uppercase">
            Validation failed — resolve the following issues:
          </p>
          <ul className="list-disc pl-5 font-mono text-xs space-y-1">
            {state.errors.map((e, i) => (
              <li key={i}>{e.path ? `${e.path}: ${e.message}` : e.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Readiness Tracker */}
      <section className="p-5 bg-white border border-[#1a130e]/15 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#1a130e]/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#b8f600] border border-[#1a130e]/20" />
            <h2 className="font-syne text-sm font-bold uppercase tracking-wider text-[#1a130e]">
              Recipe Readiness
            </h2>
          </div>
          <span
            className={`font-mono text-xs font-bold px-2 py-0.5 uppercase ${
              readyToSave
                ? "bg-[#b8f600] text-[#141f00]"
                : "bg-[#dfe0ff] text-[#000a63]"
            }`}
          >
            {readyToSave ? (mode === "edit" ? "Ready to Save" : "Ready to Create") : "In Progress"}
          </span>
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          {readiness.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 p-2 bg-[#f8f2ee] border border-[#1a130e]/10"
            >
              <span
                className={`font-bold w-4 text-center ${
                  item.state === "ok"
                    ? "text-[#001ec0]"
                    : item.state === "warning"
                      ? "text-[#ba1a1a]"
                      : "text-[#7f756f]"
                }`}
              >
                {item.state === "ok" ? "✓" : item.state === "warning" ? "⚠" : "—"}
              </span>
              <span className="text-[#1a130e] font-medium">
                {item.label}:
              </span>
              <span className="text-[#7f756f] ml-auto">
                {item.state === "neutral"
                  ? "not enabled"
                  : item.state === "ok"
                    ? "complete"
                    : "incomplete"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Basics Section */}
      <section className="p-6 bg-white border border-[#1a130e]/15 shadow-sm flex flex-col gap-5">
        <div className="flex items-center gap-2 pb-2 border-b border-[#1a130e]/10">
          <span className="w-2.5 h-2.5 bg-[#001ec0]" />
          <h2 className="font-syne text-base font-bold uppercase tracking-wider text-[#1a130e]">
            Recipe Details
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
              Recipe Name *
            </label>
            <input
              type="text"
              required
              value={draft.name}
              onChange={(e) => updateName(e.target.value)}
              placeholder="e.g. Cà Phê Trứng Bạc Xỉu"
              className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            />
            <FieldErrorText message={fieldMessage(state.errors, "name")} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
              Filename Slug *
            </label>
            <input
              type="text"
              required
              value={draft.slug}
              onChange={(e) => updateSlug(e.target.value)}
              placeholder="ca-phe-trung-bac-xiu"
              className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            />
            <p className="font-mono text-[10px]">
              {slug === "" ? (
                <span className="text-[#7f756f]">
                  Target: content/recipes/&lt;slug&gt;.json
                </span>
              ) : !slugFormatValid ? (
                <span className="text-[#ba1a1a]">
                  Lowercase letters, numbers, and dashes only
                </span>
              ) : slugTaken ? (
                <span className="text-[#ba1a1a]">
                  content/recipes/{slug}.json already exists
                </span>
              ) : (
                <span className="text-[#001ec0]">
                  ✓ content/recipes/{slug}.json is available
                </span>
              )}
            </p>
            <FieldErrorText message={fieldMessage(state.errors, "slug")} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
            Image Asset Path{" "}
            <span className="font-normal text-[#7f756f]">(optional)</span>
          </label>
          <input
            type="text"
            value={draft.image}
            onChange={(e) =>
              setDraft((d) => ({ ...d, image: e.target.value }))
            }
            placeholder={slug ? `/recipes/${slug}.jpg` : "/recipes/your-slug.jpg"}
            className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
          />
          <p className="font-mono text-[10px] text-[#7f756f]">
            Drop file in <code className="text-[#1a130e]">public/recipes/</code> or leave blank to use the Google studio photo fallback.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
              Category *
            </label>
            <select
              required
              value={draft.format}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  format: e.target.value as RecipeDraft["format"],
                }))
              }
              className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            >
              <option value="">Select Category…</option>
              {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <FieldErrorText message={fieldMessage(state.errors, "format")} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
              Sweetness Level *
            </label>
            <select
              required
              value={draft.sweetness_level}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  sweetness_level: e.target
                    .value as RecipeDraft["sweetness_level"],
                }))
              }
              className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            >
              <option value="">Select Sweetness…</option>
              {Object.entries(SWEETNESS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <FieldErrorText
              message={fieldMessage(state.errors, "sweetness_level")}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
            Description &amp; Flavor Notes *
          </label>
          <textarea
            required
            rows={3}
            value={draft.flavor_notes}
            onChange={(e) =>
              setDraft((d) => ({ ...d, flavor_notes: e.target.value }))
            }
            placeholder="e.g. Rich dark cocoa notes with thick caramelized condensed milk velvet finish..."
            className="bg-[#f8f2ee] p-2.5 font-body text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none leading-relaxed"
          />
          <FieldErrorText message={fieldMessage(state.errors, "flavor_notes")} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
            Barista Tip / Notes{" "}
            <span className="font-normal text-[#7f756f]">(optional, applies across all channels)</span>
          </label>
          <textarea
            rows={2}
            value={draft.barista_note}
            onChange={(e) =>
              setDraft((d) => ({ ...d, barista_note: e.target.value }))
            }
            placeholder="e.g. Always whip the egg yolks until ribbon stage before pouring over hot espresso..."
            className="bg-[#f8f2ee] p-2.5 font-body text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none leading-relaxed"
          />
          <p className="font-mono text-[10px] text-[#7f756f]">
            Helpful tips or hack advice. Specific channel notes can also be placed inside each channel preparation below.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
            Discovery Mood Tags
          </label>
          <TagInput
            values={draft.tags}
            onChange={(tags) => setDraft((d) => ({ ...d, tags }))}
            placeholder="e.g. afternoon-kick, summer-chilled, date-night"
          />
        </div>
      </section>

      {/* Source Attribution (Two-Tier Trust Model) */}
      <section className="p-6 bg-white border border-[#1a130e]/15 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1a130e]/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#001ec0]" />
            <h2 className="font-syne text-base font-bold uppercase tracking-wider text-[#1a130e]">
              Source Attribution (Two-Tier Model)
            </h2>
          </div>
          <span className="font-mono text-xs text-[#7f756f]">
            VENDOR · CREATOR · EDITORIAL
          </span>
        </div>

        <p className="font-mono text-xs text-[#4d4540]">
          Where did this drink formulation originate? Coffee vendor test kitchens carry high baseline trust; creator recipes capture viral social trends.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
              Source Type
            </label>
            <select
              value={draft.source.type}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  source: {
                    ...d.source,
                    type: e.target.value as RecipeSourceDraft["type"],
                  },
                }))
              }
              className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            >
              <option value="">No Source (Internal Draft)</option>
              <option value="vendor">Coffee Vendor / Roaster (e.g. Nespresso, Cometeer)</option>
              <option value="creator">Creator / Social (e.g. TikTok, Instagram)</option>
              <option value="editorial">StickyMilk Editorial (Original Recipe)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
              Source Name
            </label>
            <input
              type="text"
              value={draft.source.name}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  source: { ...d.source, name: e.target.value },
                }))
              }
              placeholder="e.g. Nespresso Official or CoffeeGal2008"
              className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
              Social Handle
            </label>
            <input
              type="text"
              value={draft.source.handle}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  source: { ...d.source, handle: e.target.value },
                }))
              }
              placeholder="e.g. @coffeegal2008"
              className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
              Platform / Network
            </label>
            <input
              type="text"
              value={draft.source.platform}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  source: { ...d.source, platform: e.target.value },
                }))
              }
              placeholder="e.g. TikTok, Instagram Reels, Official Site"
              className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-bold uppercase text-[#1a130e]">
              Original Recipe / Video URL
            </label>
            <input
              type="url"
              value={draft.source.url}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  source: { ...d.source, url: e.target.value },
                }))
              }
              placeholder="https://..."
              className="bg-[#f8f2ee] p-2.5 font-mono text-xs text-[#1a130e] border border-[#1a130e]/20 focus:border-[#001ec0] focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Preparations Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1a130e]/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#001ec0]" />
            <h2 className="font-syne text-base font-bold uppercase tracking-wider text-[#1a130e]">
              Channel Variations
            </h2>
          </div>
          <span className="font-mono text-xs text-[#7f756f]">
            {enabledChannels.length} OF 3 CHANNELS ENABLED
          </span>
        </div>

        {/* Channel Activation Toggles */}
        <div className="flex flex-wrap gap-2">
          {CHANNEL_ORDER.map((channel) => {
            const enabled = draft.preparations[channel] !== null;
            return (
              <button
                key={channel}
                type="button"
                onClick={() =>
                  enabled ? disableChannel(channel) : enableChannel(channel)
                }
                className={`px-3 py-2 font-mono text-xs uppercase font-bold transition-all cursor-pointer border ${
                  enabled
                    ? "bg-[#001ec0] text-white border-[#001ec0] shadow-xs"
                    : "bg-white text-[#1d1b19] border-[#1a130e]/20 hover:border-[#1a130e]"
                }`}
              >
                {enabled ? "✓ " : "+ "}
                {CHANNEL_LABELS[channel]}
              </button>
            );
          })}
        </div>
        <FieldErrorText message={fieldMessage(state.errors, "preparations")} />

        {/* Preparation Editors */}
        <div className="space-y-4">
          {CHANNEL_ORDER.map((channel) => {
            const prep = draft.preparations[channel];
            if (!prep) return null;
            const idx = prepIndexByChannel.get(channel);
            const errorsForThis =
              idx != null
                ? errorsWithPrefix(state.errors, `preparations[${idx}]`)
                : [];
            const cometeer = draft.preparations.cometeer;
            return (
              <PreparationEditor
                key={channel}
                channel={channel}
                prep={prep}
                collapsed={collapsed[channel]}
                onToggleCollapsed={() =>
                  setCollapsed((c) => ({ ...c, [channel]: !c[channel] }))
                }
                onChange={(patch) => updatePrep(channel, patch)}
                onDisable={() => disableChannel(channel)}
                errors={errorsForThis}
                cometeerIngredients={
                  channel !== "cometeer" && cometeer
                    ? cometeer.ingredients
                    : undefined
                }
                disabledChannels={disabledChannelsFor(channel)}
                onDuplicateTo={(target) => enableChannel(target, prep)}
                ingredientTaxonomy={ingredientTaxonomy}
              />
            );
          })}
        </div>
      </section>

      {/* Live Preview Toggle & Section */}
      <section className="flex flex-col gap-4">
        <button
          type="button"
          disabled={!previewRecipe}
          onClick={() => setShowPreview((v) => !v)}
          className="px-4 py-2.5 bg-[#1a130e] hover:bg-[#001ec0] text-white font-mono text-xs uppercase font-bold tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer w-fit"
        >
          {showPreview ? "Hide Live Preview" : "Show Live Preview"}
        </button>

        {!previewRecipe && (
          <p className="font-mono text-xs text-[#7f756f]">
            Live preview unlocks as soon as the recipe details validate cleanly.
          </p>
        )}

        {showPreview && previewRecipe && (
          <div className="border-2 border-dashed border-[#001ec0] p-4 bg-[#f8f2ee]">
            <div className="mb-4 inline-block bg-[#001ec0] text-white px-3 py-1 font-mono text-xs font-bold uppercase">
              LIVE PREVIEW — NOT YET SAVED
            </div>
            <RecipeDetail recipe={previewRecipe} />
          </div>
        )}
      </section>

      {/* Save Submission Bar */}
      <section className="pt-6 border-t border-[#1a130e]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          type="submit"
          disabled={pending || !readyToSave || slugTaken || !slugFormatValid}
          className="px-6 py-3 bg-[#001ec0] hover:bg-[#1a130e] text-white font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-[0_2px_0_#1A130E] active:translate-y-0.5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {pending
            ? mode === "edit"
              ? "Saving Changes…"
              : "Creating Recipe…"
            : mode === "edit"
              ? "Save Changes →"
              : "Create Recipe →"}
        </button>
        <p className="font-mono text-xs text-[#7f756f]">
          Saves directly to <code className="text-[#1a130e] font-bold">content/recipes/{slug || "…"}.json</code> on disk.
        </p>
      </section>
    </form>
  );
}
