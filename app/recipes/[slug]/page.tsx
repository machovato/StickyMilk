import { notFound } from "next/navigation";
import { getAllRecipes, getRecipeBySlug } from "@/lib/recipes";
import { RecipeDetail } from "@/components/RecipeDetail";
import { isAdminAuthenticated } from "@/lib/auth";

export function generateStaticParams() {
  return getAllRecipes().map((r) => ({ slug: r.slug }));
}

export default async function RecipePage(props: PageProps<"/recipes/[slug]">) {
  const { slug } = await props.params;
  const recipe = getRecipeBySlug(slug);
  if (!recipe) notFound();
  const isAdmin = await isAdminAuthenticated();
  return <RecipeDetail recipe={recipe} isAdmin={isAdmin} />;
}
