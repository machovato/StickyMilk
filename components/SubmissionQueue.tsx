"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowSquareOut,
  CheckCircle,
  Eye,
  Tray,
  Warning,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { CHANNEL_LABELS, type Channel, type Recipe } from "@/lib/types";
import {
  approveSubmissionAction,
  rejectSubmissionAction,
} from "@/lib/actions/submissions";
import { RecipeDetail } from "@/components/RecipeDetail";

export interface SubmissionView {
  id: string;
  url: string;
  name: string;
  submittedAt: string;
  creator?: string;
  platform?: string;
  image?: string;
  format: string;
  preparations: Array<{ channel: Channel; ingredients: string[] }>;
  warnings: string[];
  recipe: Recipe;
}

interface Reviewed {
  name: string;
  outcome: "approved" | "rejected";
  slug?: string;
}

export function SubmissionQueue({
  initialSubmissions,
}: {
  initialSubmissions: SubmissionView[];
}) {
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [reviewed, setReviewed] = useState<Reviewed[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerSubmission, setDrawerSubmission] =
    useState<SubmissionView | null>(null);
  const [, startTransition] = useTransition();

  // Lock body scroll and register Escape key listener while drawer is open
  useEffect(() => {
    if (drawerSubmission) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setDrawerSubmission(null);
      };
      window.addEventListener("keydown", onKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", onKeyDown);
      };
    }
  }, [drawerSubmission]);

  const review = (s: SubmissionView, outcome: "approved" | "rejected") => {
    setBusyId(s.id);
    setError(null);
    startTransition(async () => {
      const res =
        outcome === "approved"
          ? await approveSubmissionAction(s.id)
          : await rejectSubmissionAction(s.id);
      if (res.success) {
        setSubmissions((prev) => prev.filter((x) => x.id !== s.id));
        setReviewed((prev) => [
          { name: s.name, outcome, slug: res.slug },
          ...prev,
        ]);
        if (drawerSubmission?.id === s.id) {
          setDrawerSubmission(null);
        }
      } else {
        setError(`${s.name}: ${res.error}`);
      }
      setBusyId(null);
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8 text-left">
      <div className="flex flex-col gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase font-bold text-[#001ec0] hover:text-[#1a130e] transition-colors"
        >
          <ArrowLeft size={16} weight="bold" />
          <span>Back to Admin</span>
        </Link>
        <h1 className="font-syne text-2xl sm:text-4xl font-extrabold text-[#1a130e] tracking-tight">
          Review Queue
        </h1>
        <p className="font-body text-sm text-[#4d4540] max-w-2xl">
          Recipes visitors translated. Click &quot;View in Drawer&quot; to review the full
          recipe steps, ratios, and notes. Approve adds one to the vault as{" "}
          <code>needs_testing</code>, exactly as if you had translated it
          yourself. Reject removes it from this list.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-[#ffebee] border-2 border-[#ba1a1a] text-[#ba1a1a] font-mono text-xs flex items-center gap-2">
          <Warning size={18} weight="bold" />
          <span>{error}</span>
        </div>
      )}

      {reviewed.length > 0 && (
        <ul className="flex flex-col gap-1.5 font-mono text-xs">
          {reviewed.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-[#4d4540]">
              {r.outcome === "approved" ? (
                <CheckCircle
                  size={16}
                  weight="fill"
                  className="text-[#001ec0]"
                />
              ) : (
                <XCircle size={16} weight="fill" className="text-[#a89e97]" />
              )}
              <span>
                {r.outcome === "approved" ? "Added to vault" : "Rejected"}:{" "}
                <strong>{r.name}</strong>
              </span>
              {r.slug && (
                <Link
                  href={`/recipes/${r.slug}/edit`}
                  className="text-[#001ec0] underline"
                >
                  Edit
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      {submissions.length === 0 ? (
        <div className="p-10 border-2 border-dashed border-[#1a130e]/20 flex flex-col items-center gap-2 text-[#7f756f]">
          <Tray size={32} />
          <span className="font-mono text-xs uppercase">
            Nothing waiting for review
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-5">
          {submissions.map((s) => (
            <li
              key={s.id}
              className="border-2 border-[#1a130e] bg-[#fef8f4] flex flex-col sm:flex-row"
            >
              {s.image && (
                <button
                  type="button"
                  onClick={() => setDrawerSubmission(s)}
                  className="w-full sm:w-44 h-48 sm:h-auto border-b-2 sm:border-b-0 sm:border-r-2 border-[#1a130e] group relative overflow-hidden text-left focus:outline-hidden cursor-pointer"
                  title="Click to view recipe in drawer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-[#1a130e]/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white font-mono text-xs font-bold uppercase p-2 text-center">
                    <Eye size={22} weight="bold" className="text-[#b8f600]" />
                    <span>Open Drawer</span>
                  </div>
                </button>
              )}
              <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3 min-w-0">
                <div className="flex flex-col gap-1">
                  <h2
                    onClick={() => setDrawerSubmission(s)}
                    className="font-syne text-lg font-extrabold text-[#1a130e] hover:text-[#001ec0] cursor-pointer transition-colors inline-block"
                    title="Click to view recipe in drawer"
                  >
                    {s.name}
                  </h2>
                  <div className="font-mono text-[11px] text-[#7f756f] flex flex-wrap gap-x-3 gap-y-1">
                    {s.creator && (
                      <span>
                        {s.creator}
                        {s.platform ? ` (${s.platform})` : ""}
                      </span>
                    )}
                    <span className="uppercase">{s.format}</span>
                    <span>
                      Submitted {new Date(s.submittedAt).toLocaleString()}
                    </span>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#001ec0] underline truncate max-w-full"
                    >
                      Source <ArrowSquareOut size={12} />
                    </a>
                  </div>
                </div>

                <details className="font-body text-xs text-[#4d4540]">
                  <summary className="cursor-pointer font-mono uppercase text-[11px] font-bold text-[#1a130e]">
                    Ingredients by machine
                  </summary>
                  <div className="mt-2 grid sm:grid-cols-3 gap-3">
                    {s.preparations.map((p) => (
                      <div key={p.channel}>
                        <div className="font-mono text-[10px] uppercase font-bold text-[#7f756f] mb-1">
                          {CHANNEL_LABELS[p.channel] ?? p.channel}
                        </div>
                        <ul className="list-disc pl-4 flex flex-col gap-0.5">
                          {p.ingredients.map((ing, i) => (
                            <li key={i}>{ing}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>

                {s.warnings.length > 0 && (
                  <ul className="font-mono text-[11px] text-[#8a5a00] flex flex-col gap-0.5">
                    {s.warnings.map((w, i) => (
                      <li key={i}>⚠ {w}</li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDrawerSubmission(s)}
                    className="px-4 py-2 bg-[#1a130e] text-[#b8f600] hover:bg-[#001ec0] hover:text-white font-mono text-xs font-bold uppercase border border-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Eye size={16} weight="bold" />
                    <span>View in Drawer</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => review(s, "approved")}
                    className="px-4 py-2 bg-[#b8f600] text-[#141f00] font-mono text-xs font-extrabold uppercase border border-black hover:bg-white disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle size={16} weight="bold" />
                    {busyId === s.id ? "Working…" : "Approve to vault"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => review(s, "rejected")}
                    className="px-4 py-2 bg-white text-[#1a130e] font-mono text-xs font-bold uppercase border border-[#1a130e]/40 hover:border-[#ba1a1a] hover:text-[#ba1a1a] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <XCircle size={16} weight="bold" />
                    Reject
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Slide-over Review Drawer */}
      {drawerSubmission && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setDrawerSubmission(null)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <aside
            className="relative w-full max-w-4xl h-full bg-[#fef8f4] border-l-2 border-[#1a130e] shadow-2xl flex flex-col z-10 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-recipe-title"
          >
            {/* Sticky Header */}
            <div className="p-4 sm:p-5 bg-white border-b-2 border-[#1a130e] flex flex-col gap-3 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#001ec0] text-white uppercase">
                    SUBMISSION REVIEW DRAWER
                  </span>
                  <span className="font-mono text-xs text-[#7f756f]">
                    {drawerSubmission.format.toUpperCase()} · Submitted{" "}
                    {new Date(drawerSubmission.submittedAt).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerSubmission(null)}
                  className="p-1.5 border border-[#1a130e]/30 hover:border-[#1a130e] hover:bg-[#f3ede9] text-[#1a130e] transition-colors cursor-pointer"
                  aria-label="Close drawer"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1a130e]/10">
                <div className="flex flex-col min-w-0">
                  <h2
                    id="drawer-recipe-title"
                    className="font-syne text-xl sm:text-2xl font-extrabold text-[#1a130e] truncate"
                  >
                    {drawerSubmission.name}
                  </h2>
                  <div className="font-mono text-xs text-[#7f756f] flex items-center gap-2 flex-wrap">
                    {drawerSubmission.creator && (
                      <span>By {drawerSubmission.creator}</span>
                    )}
                    {drawerSubmission.platform && (
                      <span>({drawerSubmission.platform})</span>
                    )}
                    <span>·</span>
                    <a
                      href={drawerSubmission.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#001ec0] hover:underline"
                    >
                      Original Source <ArrowSquareOut size={12} weight="bold" />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => review(drawerSubmission, "approved")}
                    className="px-4 py-2 bg-[#b8f600] text-[#141f00] font-mono text-xs font-extrabold uppercase border border-black hover:bg-white disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle size={16} weight="bold" />
                    {busyId === drawerSubmission.id
                      ? "Working…"
                      : "Approve to vault"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => review(drawerSubmission, "rejected")}
                    className="px-4 py-2 bg-white text-[#1a130e] font-mono text-xs font-bold uppercase border border-[#1a130e]/40 hover:border-[#ba1a1a] hover:text-[#ba1a1a] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <XCircle size={16} weight="bold" />
                    Reject
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
              {drawerSubmission.warnings.length > 0 && (
                <div className="p-3 bg-[#fff8e1] border-2 border-[#8a5a00] font-mono text-xs text-[#8a5a00] flex flex-col gap-1">
                  <span className="font-bold flex items-center gap-1">
                    <Warning size={16} weight="bold" /> Ingestion Warnings:
                  </span>
                  <ul className="list-disc pl-5">
                    {drawerSubmission.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <RecipeDetail
                recipe={drawerSubmission.recipe}
                previewMode={true}
              />
            </div>

            {/* Sticky Footer */}
            <div className="p-4 bg-white border-t-2 border-[#1a130e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <span className="font-mono text-xs text-[#7f756f]">
                Pending Review:{" "}
                <strong className="text-[#1a130e]">
                  {drawerSubmission.name}
                </strong>
              </span>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => review(drawerSubmission, "approved")}
                  className="px-5 py-2.5 bg-[#b8f600] text-[#141f00] font-mono text-xs font-extrabold uppercase border border-black hover:bg-white disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle size={16} weight="bold" />
                  {busyId === drawerSubmission.id
                    ? "Working…"
                    : "Approve to vault"}
                </button>
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => review(drawerSubmission, "rejected")}
                  className="px-4 py-2.5 bg-white text-[#1a130e] font-mono text-xs font-bold uppercase border border-[#1a130e]/40 hover:border-[#ba1a1a] hover:text-[#ba1a1a] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <XCircle size={16} weight="bold" />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerSubmission(null)}
                  className="px-4 py-2.5 bg-[#f3ede9] hover:bg-[#e6ded8] text-[#1a130e] font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
