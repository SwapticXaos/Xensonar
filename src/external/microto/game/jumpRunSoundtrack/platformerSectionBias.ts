export type PlatformerSectionBias = "auto" | "A" | "B" | "C";

const clampSectionId = (value: number, fallback: 0 | 1 | 2): 0 | 1 | 2 => {
  if (value === 0 || value === 1 || value === 2) return value;
  return fallback;
};

export const sanitizePlatformerSectionBias = (value: unknown): PlatformerSectionBias => {
  if (value === "A" || value === "B" || value === "C") return value;
  return "auto";
};

export const formatPlatformerSectionBias = (bias: PlatformerSectionBias): string => {
  if (bias === "A" || bias === "B" || bias === "C") return `${bias}-FOCUS`;
  return "AUTO";
};

export const applyPlatformerSectionBiasToOrder = (
  order: number[],
  bias: PlatformerSectionBias,
): number[] => {
  const normalized = order.map((sectionId, index) =>
    clampSectionId(sectionId, index === 0 ? 0 : index === 1 ? 1 : 2));
  const base = normalized.length > 0 ? [...normalized] : [0, 1, 2, 1];
  while (base.length < 4) {
    base.push(base[base.length - 1] ?? 1);
  }

  if (bias === "auto") return base;
  if (bias === "A") {
    return [0, clampSectionId(base[1] ?? 1, 1), 0, clampSectionId(base[2] ?? 2, 2), 0];
  }
  if (bias === "B") {
    return [0, 1, clampSectionId(base[2] ?? 2, 2), 1, 1];
  }
  return [0, clampSectionId(base[1] ?? 1, 1), 2, clampSectionId(base[2] ?? 1, 1), 2];
};
