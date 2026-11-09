const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const parseJiRatioLabel = (label: string | null | undefined) => {
  if (!label) return null;
  if (label.toLowerCase() === "root") return 1;
  const match = label.match(/(\d+)\/(\d+)/);
  if (!match) return null;
  const num = Number(match[1]);
  const den = Number(match[2]);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
};
export const getDominantDroneRatios = (mix: Record<string, number> | undefined) =>
  Object.entries(mix ?? {})
    .map(([label, amount]) => ({
      label,
      ratio: parseJiRatioLabel(label),
      amount: clamp(amount ?? 0, 0, 1),
    }))
    .filter((entry): entry is { label: string; ratio: number; amount: number } => entry.ratio !== null && entry.amount > 0.01)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
export const getWeaveMatch = (label: string, ratios: number[]) => {
  const source = parseJiRatioLabel(label);
  if (!source || !ratios.length) return 0;
  let best = 0;
  for (const ratio of ratios) {
    const cents = Math.abs(Math.log2(source / ratio) * 1200);
    const match = clamp(1 - cents / 130, 0, 1);
    if (match > best) best = match;
  }
  return best;
};