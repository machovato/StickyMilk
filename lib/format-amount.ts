/**
 * Formats a scaled ingredient amount for display. Recipe amounts are stored
 * as plain decimals (0.5, 0.333…) so the portion scaler can multiply them;
 * this turns the result back into something a kitchen would recognize
 * ("1/2", "1 1/3") instead of "0.5" or "1.3333333333333333".
 */
export function formatAmount(amount: number): string {
  const whole = Math.floor(amount);
  const frac = amount - whole;

  if (frac < 0.02) return String(whole);

  const FRACTIONS: [number, string][] = [
    [0.125, "1/8"],
    [0.25, "1/4"],
    [1 / 3, "1/3"],
    [0.375, "3/8"],
    [0.5, "1/2"],
    [0.625, "5/8"],
    [2 / 3, "2/3"],
    [0.75, "3/4"],
    [0.875, "7/8"],
  ];
  const match = FRACTIONS.find(([value]) => Math.abs(value - frac) < 0.02);
  if (match) {
    const [, label] = match;
    return whole > 0 ? `${whole} ${label}` : label;
  }

  // No clean fraction match — fall back to a trimmed decimal.
  const rounded = Math.round(amount * 100) / 100;
  return String(rounded);
}

const PLURALIZABLE_UNITS: Record<string, string> = {
  pod: "pods",
  capsule: "capsules",
  cup: "cups",
  shot: "shots",
  can: "cans",
  bottle: "bottles",
  piece: "pieces",
  egg: "eggs",
  wedge: "wedges",
};

/** Renders "amount unit" for an ingredient, optionally with a secondary
 *  quantity in parens ("3 oz (90 ml)") — both already scaled by the caller
 *  using the same multiplier, since they represent the same real quantity
 *  in two units. Returns null when there's no real quantity to show (e.g.
 *  "Ice"). */
export function formatIngredientAmount(
  amount: number | undefined,
  unit: string | undefined,
  secondaryAmount?: number,
  secondaryUnit?: string
): string | null {
  if (amount == null) return null;
  const formatted = formatAmount(amount);

  let displayUnit = unit;
  if (unit && amount > 1) {
    const plural = PLURALIZABLE_UNITS[unit.toLowerCase()];
    if (plural) displayUnit = plural;
  }

  const primary = displayUnit ? `${formatted} ${displayUnit}` : formatted;
  if (secondaryAmount == null) return primary;
  const secondaryFormatted = formatAmount(secondaryAmount);
  const secondary = secondaryUnit ? `${secondaryFormatted} ${secondaryUnit}` : secondaryFormatted;
  return `${primary} (${secondary})`;
}
