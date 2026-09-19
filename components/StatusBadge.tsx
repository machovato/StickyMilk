import type { RecipeStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";

const STYLES: Record<RecipeStatus, string> = {
  draft:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  needs_testing:
    "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-900",
  verified:
    "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200 dark:bg-green-950 dark:text-green-300 dark:ring-green-900",
};

export function StatusBadge({ status }: { status: RecipeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
