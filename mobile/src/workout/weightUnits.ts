export type WeightUnit = "kg" | "lb";
export const POUNDS_PER_KILOGRAM = 2.2046226218;
export function weightFromKg(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg * POUNDS_PER_KILOGRAM : kg;
}
export function weightToKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value / POUNDS_PER_KILOGRAM : value;
}
export type WeightDraft = Readonly<{ text: string; unit: WeightUnit }>;
export function parseWeightDraft({ text, unit }: WeightDraft): { valid: true; kg: number | null } | { valid: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { valid: true, kg: null };
  const kg = weightToKg(Number(trimmed), unit);
  if (!/^(?:\d{1,4}(?:\.\d{0,2})?|\.\d{1,2})$/.test(trimmed) || !Number.isFinite(kg) || kg > 1000) {
    return { valid: false, error: unit === "kg"
      ? "Enter 0 to 1,000 kg, with up to two decimal places, or leave weight blank. Use a decimal point."
      : "Enter 0 to 2,204.62 lb (maximum 1,000 kg), with up to two decimal places, or leave weight blank. Use a decimal point." };
  }
  return { valid: true, kg };
}
// Rounding is exclusively presentation. Never feed this back into canonical data.
export function formatWeightValue(kg: number, unit: WeightUnit): string {
  const value = weightFromKg(kg, unit);
  if (!Number.isFinite(value)) return "Unavailable";
  return value > 0 && value < 0.01 ? "<0.01" : String(Number(value.toFixed(2)));
}
export function weightDraftDisplay(canonicalKg: string, draft: WeightDraft | null | undefined, unit: WeightUnit): string {
  const original = draft ?? { text: canonicalKg, unit: "kg" };
  if (original.unit === unit || !original.text.trim()) return original.text;
  const parsed = parseWeightDraft(original);
  if (!parsed.valid || parsed.kg === null) return original.text;
  const converted = weightFromKg(parsed.kg, unit);
  // Preserve a positive numeric editable value for very small converted weights.
  return String(Number(converted.toFixed(converted > 0 && converted < 0.01 ? 8 : 2)));
}
