import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { listPendingSubmissions } from "@/lib/submissions";
import { SubmissionQueue, type SubmissionView } from "@/components/SubmissionQueue";

export const metadata = {
  title: "StickyMilk // Review Queue",
  description: "Approve or reject visitor translations before they enter the vault.",
};

export default async function SubmissionsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login?next=/admin/submissions");
  }

  let pending;
  try {
    pending = await listPendingSubmissions();
  } catch (err) {
    console.error("[Admin] Couldn't read the review queue:", err);
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-12 font-mono text-sm text-[#ba1a1a]">
        The review queue database isn&apos;t set up yet. Run <code>npm run db:push</code> and reload.
      </div>
    );
  }

  // Only what the review card needs goes to the client
  const submissions: SubmissionView[] = pending.map((s) => {
    const { recipe, ir, warnings } = s.result;
    return {
      id: s.id,
      url: s.url,
      name: s.name,
      submittedAt: s.createdAt.toISOString(),
      creator: recipe.source?.handle || recipe.source?.name,
      platform: recipe.source?.platform,
      image: ir.hero_frame_base64 ? `data:image/jpeg;base64,${ir.hero_frame_base64}` : ir.thumbnail_url,
      format: recipe.format,
      preparations: recipe.preparations.map((p) => ({
        channel: p.channel,
        ingredients: p.ingredients.map((i) =>
          [i.amount, i.unit, i.item].filter((x) => x !== undefined && x !== "").join(" ")
        ),
      })),
      warnings,
    };
  });

  return <SubmissionQueue initialSubmissions={submissions} />;
}
