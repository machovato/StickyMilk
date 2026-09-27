import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { getAllRecipes } from "@/lib/recipes";
import { AdminDashboard } from "@/components/AdminDashboard";
import { countPendingSubmissions } from "@/lib/submissions";

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
  // The queue lives in the database; a missing table (db:push not run yet)
  // must not take down the whole admin page.
  const pendingSubmissions = await countPendingSubmissions().catch(() => 0);
  return <AdminDashboard initialRecipes={recipes} pendingSubmissions={pendingSubmissions} />;
}
