import { getAllRecipes } from "@/lib/recipes";
import { RecipeLibrary } from "@/components/RecipeLibrary";

export const metadata = {
  title: "Recipe Vault // StickyMilk",
  description:
    "Browse, filter, and search the complete StickyMilk multi-channel coffee recipe catalog for Cometeer, Nespresso, and Instant.",
};

export default function RecipesPage() {
  const recipes = getAllRecipes();
  return <RecipeLibrary recipes={recipes} />;
}
