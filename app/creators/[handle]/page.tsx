import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowSquareOut, Heart } from "@phosphor-icons/react/dist/ssr";
import { getAllCreators, getCreatorBySlug } from "@/lib/recipes";
import { RecipeLibrary } from "@/components/RecipeLibrary";

export function generateStaticParams() {
  return getAllCreators().map((c) => ({ handle: c.slug }));
}

interface CreatorPageProps {
  params: Promise<{ handle: string }>;
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { handle } = await params;
  const creator = getCreatorBySlug(handle);

  if (!creator) {
    notFound();
  }

  const followUrl =
    creator.url ||
    (creator.handle
      ? `https://www.tiktok.com/${creator.handle}`
      : undefined);

  return (
    <div className="flex flex-col gap-6">
      {/* Creator Channel Header */}
      <div className="bg-[#1a130e] text-white border-b border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-mono text-xs uppercase font-bold text-[#b8f600] hover:text-white transition-colors w-fit"
          >
            <ArrowLeft size={16} weight="bold" />
            <span>Back to All Recipes</span>
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-6">
              {creator.avatar ? (
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#b8f600] shadow-lg flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#2a211a] border-2 border-white/20 flex items-center justify-center font-syne text-2xl font-bold text-white flex-shrink-0">
                  {creator.name[0]}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#001ec0] text-white">
                    {creator.platform ? `${creator.platform.toUpperCase()} CREATOR` : "CREATOR CHANNEL"}
                  </span>
                  <span className="font-mono text-xs text-[#b8f600]">
                    {creator.recipes.length} {creator.recipes.length === 1 ? "RECIPE" : "RECIPES"} IN VAULT
                  </span>
                </div>

                <h1 className="font-syne text-2xl sm:text-4xl font-bold tracking-tight text-white">
                  {creator.name}
                </h1>

                {creator.handle && (
                  <span className="font-mono text-sm text-[#d1c4bd]">
                    {creator.handle}
                  </span>
                )}
              </div>
            </div>

            {/* Follow on Platform Button */}
            {followUrl && (
              <a
                href={followUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 bg-[#b8f600] hover:bg-white text-[#1a130e] font-mono text-xs font-bold uppercase tracking-wider transition-colors shadow-md flex-shrink-0 cursor-pointer"
              >
                <Heart size={16} weight="fill" className="text-[#1a130e]" />
                <span>Follow {creator.handle || creator.name}</span>
                <ArrowSquareOut size={14} weight="bold" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Filterable Recipe Feed for this Creator */}
      <RecipeLibrary recipes={creator.recipes} />
    </div>
  );
}
