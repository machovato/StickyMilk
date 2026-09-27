import { getAllRecipes } from "@/lib/recipes";
import { HomePortal } from "@/components/HomePortal";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "StickyMilk // Coffee Recipes for the Systems You Own",
  description:
    "You saw a coffee drink you want. StickyMilk shows you how to make it with Cometeer, Nespresso Vertuo, or Specialty Instant.",
};

export default function HomePage() {
  const recipes = getAllRecipes();
  // The hero recipe is chosen on the Edit page ("Make Current Obsession")
  return <HomePortal recipes={recipes} obsessionSlug={getSiteSettings().current_obsession} />;
}
