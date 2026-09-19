import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { RecipeForm } from "@/components/RecipeForm";
import { getAllRecipes } from "@/lib/recipes";
import { getIngredientTaxonomy } from "@/lib/taxonomy";

// Local-authoring-only tool: writes to content/recipes/*.json on disk,
// which only makes sense against a local dev filesystem.
export default function NewRecipePage() {
  if (process.env.NODE_ENV === "production") notFound();

  const existingSlugs = getAllRecipes().map((r) => r.slug);
  const ingredientTaxonomy = getIngredientTaxonomy();

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 text-left">
      {/* Top Breadcrumb & ID */}
      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-[#1a130e]/10">
        <Link
          href="/"
          className="flex items-center gap-1 font-mono text-xs uppercase font-bold text-[#001ec0] hover:text-[#1a130e] transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Back to Archive</span>
        </Link>
        <span className="text-[#d1c4bd]">|</span>
        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#b8f600] text-[#141f00] uppercase">
          DEV AUTHORING
        </span>
        <span className="font-mono text-xs text-[#7f756f]">
          PROTOCOL GENERATOR
        </span>
      </div>

      <div className="flex flex-col gap-2 mb-8">
        <h1 className="font-syne text-3xl sm:text-4xl font-bold tracking-tight text-[#1a130e]">
          Register New Recipe Protocol
        </h1>
        <p className="font-body text-sm text-[#4d4540]">
          Writes directly to <code className="font-mono text-xs bg-[#f3ede9] px-1.5 py-0.5 text-[#1a130e]">content/recipes/&lt;slug&gt;.json</code> on your local filesystem.
        </p>
      </div>

      <RecipeForm
        existingSlugs={existingSlugs}
        ingredientTaxonomy={ingredientTaxonomy}
      />
    </div>
  );
}
