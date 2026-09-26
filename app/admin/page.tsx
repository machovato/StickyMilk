import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAllRecipes } from "@/lib/recipes";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata = {
  title: "StickyMilk // Admin Command Center",
  description: "Manage recipes, rate and verify drinks, and moderate vault submissions.",
};

export default async function AdminPage() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect("/admin/login?next=/admin");
  }

  const recipes = getAllRecipes();
  return <AdminDashboard initialRecipes={recipes} />;
}
