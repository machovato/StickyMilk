import { getAllRecipes } from "@/lib/recipes";
import { HomePortal } from "@/components/HomePortal";

export const metadata = {
  title: "StickyMilk // Coffee Recipes for the Systems You Own",
  description:
    "You saw a coffee drink you want. StickyMilk shows you how to make it with Cometeer, Nespresso Vertuo, or Specialty Instant.",
};

export default function HomePage() {
  const recipes = getAllRecipes();
  return <HomePortal recipes={recipes} />;
}
