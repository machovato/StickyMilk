"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowSquareOut,
  CheckCircle,
  Clock,
  Eye,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Star,
  Trash,
  Tray,
  VideoCamera,
  Warning,
} from "@phosphor-icons/react";
import type { Recipe } from "@/lib/types";
import { FORMAT_LABELS } from "@/lib/types";
import { deleteRecipeAction } from "@/lib/actions/delete-recipe";

interface AdminDashboardProps {
  initialRecipes: Recipe[];
  /** Visitor translations waiting in /admin/submissions */
  pendingSubmissions: number;
}

export function AdminDashboard({ initialRecipes, pendingSubmissions }: AdminDashboardProps) {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [activeTab, setActiveTab] = useState<"all" | "needs_testing" | "verified">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [confirmSlug, setConfirmSlug] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needsTestingCount = recipes.filter((r) => r.status === "needs_testing").length;
  const verifiedCount = recipes.filter((r) => r.status === "verified").length;

  const filteredRecipes = recipes.filter((r) => {
    // Tab filter
    if (activeTab === "needs_testing" && r.status !== "needs_testing") return false;
    if (activeTab === "verified" && r.status !== "verified") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchSlug = r.slug.toLowerCase().includes(q);
      const matchCreator = (r.source?.name || "").toLowerCase().includes(q) || (r.source?.handle || "").toLowerCase().includes(q);
      const matchTags = r.tags.some((t) => t.toLowerCase().includes(q));
      return matchName || matchSlug || matchCreator || matchTags;
    }

    return true;
  });

  const handleDelete = (slug: string) => {
    setActionError(null);
    setDeletingSlug(slug);

    startTransition(async () => {
      const res = await deleteRecipeAction(slug);
      if (res.success) {
        setRecipes((prev) => prev.filter((r) => r.slug !== slug));
        setConfirmSlug(null);
        setDeletingSlug(null);
        router.refresh();
      } else {
        setActionError(res.error || "Failed to delete recipe");
        setDeletingSlug(null);
      }
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8 text-left">
      {/* Top Banner & Overview */}
      <div className="bg-[#1a130e] text-white p-6 sm:p-8 border-2 border-black flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#b8f600] text-[#141f00] font-mono text-[11px] font-extrabold uppercase">
              ADMIN CONTROL CENTER
            </span>
            <span className="font-mono text-xs text-[#a89e97]">
              {recipes.length} TOTAL IN VAULT
            </span>
          </div>

          <h1 className="font-syne text-2xl sm:text-4xl font-extrabold text-[#fef8f4] tracking-tight">
            Vault Moderation &amp; Test Kitchen Lab
          </h1>
          <p className="font-body text-xs sm:text-sm text-[#d1c4bd] max-w-2xl leading-relaxed">
            Manage recipes, review unverified community video ingestions, log test kitchen tasting scores, and moderate content.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/submissions"
            className="px-4 py-2.5 bg-[#1a130e] hover:bg-white hover:text-[#1a130e] text-white font-mono text-xs font-bold uppercase tracking-wider border border-white/20 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Tray size={16} weight="fill" />
            <span>Review Queue ({pendingSubmissions})</span>
          </Link>

          <Link
            href="/translate"
            className="px-4 py-2.5 bg-[#001ec0] hover:bg-white hover:text-[#001ec0] text-white font-mono text-xs font-bold uppercase tracking-wider border border-white/20 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <VideoCamera size={16} weight="fill" />
            <span>Translate Reel</span>
          </Link>

          <Link
            href="/recipes/new"
            className="px-4 py-2.5 bg-[#b8f600] hover:bg-white text-[#141f00] font-mono text-xs font-extrabold uppercase tracking-wider border border-black transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} weight="bold" />
            <span>New Recipe</span>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-4 bg-[#ffebee] border-2 border-[#ba1a1a] text-[#ba1a1a] font-mono text-xs flex items-center gap-2">
          <Warning size={18} weight="bold" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#1a130e] pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "all"
                ? "bg-[#1a130e] text-[#b8f600]"
                : "bg-white text-[#1a130e] border border-[#1a130e]/20 hover:border-[#1a130e]"
            }`}
          >
            All Recipes ({recipes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("needs_testing")}
            className={`px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "needs_testing"
                ? "bg-[#ff9800] text-black font-extrabold"
                : "bg-white text-[#1a130e] border border-[#1a130e]/20 hover:border-[#1a130e]"
            }`}
          >
            <Clock size={14} weight="bold" />
            <span>Needs Testing ({needsTestingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("verified")}
            className={`px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "verified"
                ? "bg-[#b8f600] text-[#141f00] font-extrabold"
                : "bg-white text-[#1a130e] border border-[#1a130e]/20 hover:border-[#1a130e]"
            }`}
          >
            <CheckCircle size={14} weight="fill" />
            <span>Verified ({verifiedCount})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <MagnifyingGlass
            size={16}
            weight="bold"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f756f]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, creator, slug..."
            className="w-full pl-9 pr-3 py-2 bg-white text-[#1a130e] placeholder-[#a89e97] font-mono text-xs border border-[#1a130e]/30 focus:border-[#001ec0] focus:outline-none"
          />
        </div>
      </div>

      {/* Recipes Table / Card Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="p-12 text-center bg-white border-2 border-dashed border-[#1a130e]/20 flex flex-col items-center justify-center gap-3">
          <p className="font-mono text-xs text-[#7f756f] uppercase">
            No recipes matched your active filter.
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[#001ec0] font-mono text-xs underline font-bold cursor-pointer"
            >
              Clear search query
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredRecipes.map((recipe) => {
            const isNeedsTesting = recipe.status === "needs_testing";
            const isVerified = recipe.status === "verified";
            const hasReview = recipe.review && recipe.review.score != null;

            return (
              <div
                key={recipe.slug}
                className="bg-white border-2 border-[#1a130e]/20 hover:border-[#1a130e] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors shadow-xs"
              >
                {/* Left Side: Thumbnail & Details */}
                <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#221a15] border border-black flex-shrink-0 overflow-hidden relative">
                    {recipe.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={recipe.image}
                        alt={recipe.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-mono text-[10px] text-[#a89e97] text-center p-1">
                        NO IMAGE
                      </div>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isNeedsTesting ? (
                        <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 bg-[#fff3e0] text-[#e65100] border border-[#ffe0b2] uppercase flex items-center gap-1">
                          <Clock size={12} weight="bold" />
                          <span>NEEDS TESTING</span>
                        </span>
                      ) : isVerified ? (
                        <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 bg-[#e8f5e9] text-[#2e7d32] border border-[#c8e6c9] uppercase flex items-center gap-1">
                          <CheckCircle size={12} weight="fill" />
                          <span>VERIFIED BENCHMARK</span>
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#ede7e3] text-[#7f756f] uppercase">
                          DRAFT
                        </span>
                      )}

                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-[#f3ede9] text-[#1a130e] uppercase">
                        {FORMAT_LABELS[recipe.format]}
                      </span>

                      {hasReview && (
                        <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 bg-[#1a130e] text-[#b8f600] flex items-center gap-1">
                          <Star size={11} weight="fill" />
                          <span>{recipe.review!.score.toFixed(1)} / 10</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-syne text-base sm:text-lg font-bold text-[#1a130e] truncate">
                      {recipe.name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs font-mono text-[#7f756f] flex-wrap">
                      <span className="text-[#001ec0] font-semibold">
                        /{recipe.slug}
                      </span>
                      {recipe.source?.name && (
                        <>
                          <span>•</span>
                          <span>
                            By <strong>{recipe.source.name}</strong>{" "}
                            {recipe.source.handle && `(${recipe.source.handle})`}
                          </span>
                        </>
                      )}
                      {recipe.source?.url && (
                        <>
                          <span>•</span>
                          <a
                            href={recipe.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#001ec0] underline hover:text-[#1a130e] flex items-center gap-0.5"
                          >
                            <span>Source Reel</span>
                            <ArrowSquareOut size={12} />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Admin Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <Link
                    href={`/recipes/${recipe.slug}`}
                    className="p-2 sm:px-3 sm:py-2 bg-white hover:bg-[#f3ede9] text-[#1a130e] border border-[#1a130e]/30 font-mono text-xs font-bold uppercase transition-colors flex items-center gap-1.5"
                    title="View Drink in Vault"
                  >
                    <Eye size={15} weight="bold" />
                    <span className="hidden sm:inline">View</span>
                  </Link>

                  <Link
                    href={`/recipes/${recipe.slug}/edit`}
                    className="p-2 sm:px-3 sm:py-2 bg-[#1a130e] hover:bg-[#001ec0] text-[#b8f600] hover:text-white font-mono text-xs font-bold uppercase transition-colors flex items-center gap-1.5"
                    title="Edit Recipe & Log Review"
                  >
                    <PencilSimple size={15} weight="bold" />
                    <span className="hidden sm:inline">Test &amp; Rate</span>
                  </Link>

                  {/* Delete Button with Confirmation Toggle */}
                  {confirmSlug === recipe.slug ? (
                    <div className="flex items-center gap-1 bg-[#ffebee] border border-[#ba1a1a] p-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(recipe.slug)}
                        disabled={deletingSlug === recipe.slug || isPending}
                        className="px-2 py-1 bg-[#ba1a1a] text-white font-mono text-[11px] font-bold uppercase hover:bg-black transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingSlug === recipe.slug ? "Deleting..." : "Confirm Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmSlug(null)}
                        className="px-2 py-1 text-[#7f756f] hover:text-black font-mono text-[11px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmSlug(recipe.slug)}
                      className="p-2 text-[#7f756f] hover:text-[#ba1a1a] hover:bg-[#ffebee] border border-transparent hover:border-[#ba1a1a]/30 transition-colors cursor-pointer"
                      title="Delete recipe from vault"
                    >
                      <Trash size={16} weight="bold" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
