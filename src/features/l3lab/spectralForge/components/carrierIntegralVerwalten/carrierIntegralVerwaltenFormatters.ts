import type { CarrierIntegralEditorIntent } from "../../../contracts/carrierIntegralEditorIntent";
import type { ForgeProjectMeta } from "../../projectLibrary";

export function formatLibraryDate(value: number): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export function formatPercent(value: number) {
  return Math.round(value * 100) + "%";
}

export function normalizeIntentProjectName(value: string | null | undefined): string {
  return String(value || "").split("·")[0]?.trim().toLowerCase() ?? "";
}

export function resolveProjectForEditorIntent(
  entries: ForgeProjectMeta[],
  intent: CarrierIntegralEditorIntent,
): ForgeProjectMeta | null {
  if (intent.carrierProjectId) {
    const direct = entries.find((entry) => entry.id === intent.carrierProjectId);
    if (direct) return direct;
  }
  const materialStem = normalizeIntentProjectName(intent.carrierProjectName ?? intent.materialName);
  if (!materialStem) return null;
  return entries
    .slice()
    .sort((a, b) => b.name.length - a.name.length)
    .find((entry) => {
      const entryName = entry.name.trim().toLowerCase();
      return entryName.length > 0 && (materialStem === entryName || materialStem.startsWith(entryName));
    }) ?? null;
}
