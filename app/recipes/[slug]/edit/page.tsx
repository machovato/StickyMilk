import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { RecipeForm } from "@/components/RecipeForm";
import { getAllRecipes, getRecipeBySlug } from "@/lib/recipes";
import { getIngredientTaxonomy } from "@/lib/taxonomy";
import { recipeToDraft } from "@/lib/recipe-draft";
import { isAdminAuthenticated } from "@/lib/auth";

export default async function EditRecipePage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect(`/admin/login?next=/recipes/${encodeURIComponent(slug)}/edit`);
  }

  const recipe = getRecipeBySlug(slug);
  if (!recipe) {
    notFound();
  }

  const existingSlugs = getAllRecipes().map((r) => r.slug);
  const ingredientTaxonomy = getIngredientTaxonomy();
  const initialDraft = recipeToDraft(recipe);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 text-left">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-[#1a130e]/10">
        <Link
          href={`/recipes/${recipe.slug}`}
          className="flex items-center gap-1 font-mono text-xs uppercase font-bold text-[#001ec0] hover:text-[#1a130e] transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Back to Recipe</span>
        </Link>
        <span className="text-[#d1c4bd]">|</span>
        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#b8f600] text-[#141f00] uppercase">
          ADMIN AUTHORING
        </span>
        <span className="font-mono text-xs text-[#7f756f]">
          EDIT PROTOCOL // {recipe.slug.toUpperCase()}
        </span>
      </div>

      <div className="flex flex-col gap-2 mb-8">
        <h1 className="font-syne text-3xl sm:text-4xl font-bold tracking-tight text-[#1a130e]">
          Edit Protocol: {recipe.name}
        </h1>
        <p className="font-body text-sm text-[#4d4540]">
          Updates <code className="font-mono text-xs bg-[#f3ede9] px-1.5 py-0.5 text-[#1a130e]">content/recipes/{recipe.slug}.json</code> directly on disk.
        </p>
      </div>

      <RecipeForm
        existingSlugs={existingSlugs}
        ingredientTaxonomy={ingredientTaxonomy}
        initialDraft={initialDraft}
        mode="edit"
        originalSlug={recipe.slug}
      />
    </div>
  );
}
