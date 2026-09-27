"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";
import { ingestTranslation } from "@/lib/translator/ingest";
import { getPendingSubmission, markSubmission } from "@/lib/submissions";

type ReviewResult = { success: true; slug?: string } | { success: false; error: string };

/** Writes a visitor's queued translation to the vault, exactly as an admin translation would be. */
export async function approveSubmissionAction(id: string): Promise<ReviewResult> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, error: "Unauthorized: admin sign-in required." };
  }
  const submission = await getPendingSubmission(id);
  if (!submission) return { success: false, error: "That submission was already reviewed." };

  const ingest = await ingestTranslation(submission.result);
  if (!ingest.written) {
    return {
      success: false,
      error: `Couldn't add it to the vault: ${ingest.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`,
    };
  }
  await markSubmission(id, "approved", ingest.slug);

  try {
    revalidatePath("/");
    revalidatePath("/recipes");
    revalidatePath("/admin");
    revalidatePath("/admin/submissions");
  } catch {
    // Safe to ignore outside a revalidation context
  }
  return { success: true, slug: ingest.slug };
}

export async function rejectSubmissionAction(id: string): Promise<ReviewResult> {
  if (!(await isAdminAuthenticated())) {
    return { success: false, error: "Unauthorized: admin sign-in required." };
  }
  if (!(await getPendingSubmission(id))) {
    return { success: false, error: "That submission was already reviewed." };
  }
  await markSubmission(id, "rejected");
  try {
    revalidatePath("/admin");
    revalidatePath("/admin/submissions");
  } catch {
    // Safe to ignore outside a revalidation context
  }
  return { success: true };
}
