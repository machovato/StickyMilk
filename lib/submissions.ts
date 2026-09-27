import "server-only";
import { prisma } from "@/lib/prisma";
import type { TranslationResult } from "@/lib/translator/types";

/**
 * Review queue for visitor translations. Visitors see their translation as
 * a preview and it's queued here; the admin approves (-> vault) or rejects
 * at /admin/submissions.
 */

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface QueuedSubmission {
  id: string;
  createdAt: Date;
  url: string;
  name: string;
  status: SubmissionStatus;
  result: TranslationResult;
}

export async function queueSubmission(url: string, result: TranslationResult): Promise<void> {
  await prisma.submission.create({
    data: { url, name: result.recipe.name, result: JSON.stringify(result) },
  });
}

export async function listPendingSubmissions(): Promise<QueuedSubmission[]> {
  const rows = await prisma.submission.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    url: r.url,
    name: r.name,
    status: r.status as SubmissionStatus,
    result: JSON.parse(r.result) as TranslationResult,
  }));
}

export async function countPendingSubmissions(): Promise<number> {
  return prisma.submission.count({ where: { status: "pending" } });
}

export async function getPendingSubmission(id: string): Promise<QueuedSubmission | null> {
  const r = await prisma.submission.findFirst({ where: { id, status: "pending" } });
  if (!r) return null;
  return {
    id: r.id,
    createdAt: r.createdAt,
    url: r.url,
    name: r.name,
    status: "pending",
    result: JSON.parse(r.result) as TranslationResult,
  };
}

export async function markSubmission(
  id: string,
  status: Exclude<SubmissionStatus, "pending">,
  slug?: string
): Promise<void> {
  await prisma.submission.update({
    where: { id },
    data: { status, slug, reviewedAt: new Date() },
  });
}
