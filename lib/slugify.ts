/** Ascii, lowercase, dash-separated slug from a recipe name. Pure/no I/O. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents (combining diacritical marks), e.g. "Cà Phê" -> "Ca Phe"
    .toLowerCase()
    .replace(/'/g, "") // drop apostrophes without leaving a stray dash
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
