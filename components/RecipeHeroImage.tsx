import type { Recipe } from "@/lib/types";
import { getRecipeImage } from "@/lib/recipe-images";

export function RecipeHeroImage({ recipe }: { recipe: Recipe }) {
  const photo = recipe.image
    ? { imageUrl: recipe.image, imageAlt: recipe.name }
    : getRecipeImage(recipe.slug);

  return (
    <div className="h-64 sm:h-80 md:h-96 w-full overflow-hidden border border-[#1a130e]/10 bg-[#221a15]">
      {/* eslint-disable-next-line @next/next/no-img-element -- Studio photography mapped from Stitch prototype */}
      <img
        src={photo.imageUrl}
        alt={photo.imageAlt || recipe.name}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
