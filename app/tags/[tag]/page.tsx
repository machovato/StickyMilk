import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Tag } from "@phosphor-icons/react/dist/ssr";
import { getAllTags, getRecipesByTag } from "@/lib/recipes";
import { RecipeLibrary } from "@/components/RecipeLibrary";

export function generateStaticParams() {
  return getAllTags().map((t) => ({ tag: t.tag }));
}

interface TagPageProps {
  params: Promise<{ tag: string }>;
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag).toLowerCase().trim();
  const recipes = getRecipesByTag(decodedTag);

  if (!recipes || recipes.length === 0) {
    notFound();
  }

  const displayTag = decodedTag.replace(/-/g, " ");

  return (
    <div className="flex flex-col gap-6">
      {/* Tag Collection Header */}
      <div className="bg-[#1a130e] text-white border-b border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase font-bold text-[#b8f600] hover:text-white transition-colors w-fit"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Back to All Recipes</span>
          </Link>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#001ec0] text-white">
                COLLECTION // THEME
              </span>
              <span className="font-mono text-xs text-[#b8f600]">
                {recipes.length} {recipes.length === 1 ? "RECIPE" : "RECIPES"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Tag size={32} weight="bold" className="text-[#b8f600]" />
              <h1 className="font-syne text-3xl sm:text-5xl font-bold tracking-tight text-white capitalize">
                {displayTag}
              </h1>
            </div>

            <p className="font-body text-xs sm:text-sm text-[#d1c4bd] max-w-xl">
              Curated {displayTag} recipes translated for Cometeer, Nespresso, and Instant coffee systems.
            </p>
          </div>
        </div>
      </div>

      {/* Filterable Recipe Grid for this Tag */}
      <RecipeLibrary recipes={recipes} />
    </div>
  );
}
