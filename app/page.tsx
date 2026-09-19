import { getAllRecipes } from "@/lib/recipes";
import { RecipeLibrary } from "@/components/RecipeLibrary";

export default function HomePage() {
  const recipes = getAllRecipes();
  return <RecipeLibrary recipes={recipes} />;
}
