import type { CarrierIntegralMachineId } from '../spectralForge/integral';
import { buildCarrierIntegralRootFollowArtifact } from '../spectralForge/integral/carrierIntegralAudition';
import { loadForgeProject, type ForgeProjectMeta } from '../spectralForge/projectLibrary';
import { createCarrierIntegralEditorIntent } from '../contracts/carrierIntegralEditorIntent';
import type { CarrierIntegralPinkExportDetail } from '../contracts/carrierIntegralPinkExportContract';
import type { CarrierIntegralPinkVariant } from './loopDrumDomain';
import { isCarrierIntegralMelodicPinkDetailReady, type MaterialImportEntrySummary } from './materialImportChannel';

const CARRIER_INTEGRAL_MACHINE_IDS = new Set<string>([
  'raw-darkpsy-oscillator',
  'branch-a-line-traffic',
  'branch-b573-synth-window',
  'branch-c-interval-body',
]);

export function carrierPrismDisplayName(machineId: CarrierIntegralMachineId): string {
  switch (machineId) {
    case 'raw-darkpsy-oscillator':
      return 'Pure Dieter';
    case 'branch-a-line-traffic':
      return 'Antonia';
    case 'branch-b573-synth-window':
      return 'Bert';
    case 'branch-c-interval-body':
      return 'Cecilia';
    default:
      return machineId;
  }
}

export function asKnownCarrierIntegralMachineId(value: unknown): CarrierIntegralMachineId | null {
  const candidate = typeof value === 'string' ? value : '';
  return CARRIER_INTEGRAL_MACHINE_IDS.has(candidate) ? candidate as CarrierIntegralMachineId : null;
}

export function normalizeMaterialProjectName(value: string | null | undefined): string {
  return String(value || '').split('·')[0]?.trim().toLowerCase() ?? '';
}

export function resolveAudioPaintRepairTarget(
  entry: MaterialImportEntrySummary,
  projects: ForgeProjectMeta[],
): { project: ForgeProjectMeta; machineId: CarrierIntegralMachineId | null; detail: CarrierIntegralPinkExportDetail | null } | null {
  const detail = entry.audioPaintRepairDetail ?? entry.audioPaintDetail ?? null;
  const byId = detail?.carrierProjectId
    ? projects.find((project) => project.id === detail.carrierProjectId)
    : null;
  const materialStem = normalizeMaterialProjectName(detail?.materialName ?? entry.name);
  const byName = byId ?? projects
    .slice()
    .sort((a, b) => b.name.length - a.name.length)
    .find((project) => {
      const projectName = project.name.trim().toLowerCase();
      return projectName.length > 0 && (materialStem === projectName || materialStem.startsWith(projectName));
    }) ?? null;
  if (!byName) return null;
  const machineId = asKnownCarrierIntegralMachineId(detail?.machineId) ?? asKnownCarrierIntegralMachineId(byName.carrierIntegral?.machineId);
  return { project: byName, machineId, detail };
}


export type AudioPaintRepairDetailBuildResult = {
  ok: boolean;
  detail?: CarrierIntegralPinkExportDetail;
  reason: string;
  projectName?: string;
};

export async function buildAudioPaintRepairDetailForEntry(args: {
  entry: MaterialImportEntrySummary;
  projects: ForgeProjectMeta[];
  variant: CarrierIntegralPinkVariant;
}): Promise<AudioPaintRepairDetailBuildResult> {
  const target = resolveAudioPaintRepairTarget(args.entry, args.projects);
  if (!target) {
    return {
      ok: false,
      reason: 'Kein passender SpectralForge-Projektstand gefunden. Nutze Bearbeiten und wähle die Figur in der Labor-Bibliothek neu.',
    };
  }
  if (!target.machineId) {
    return {
      ok: false,
      projectName: target.project.name,
      reason: 'Keine eindeutige Labor-Hörweise am Audio-Paint-Eintrag. Bearbeiten öffnen und Hörweise bewusst neu senden.',
    };
  }

  const snapshot = await loadForgeProject(target.project.id);
  const artifact = buildCarrierIntegralRootFollowArtifact({
    projectName: target.project.name,
    snapshot,
    machineId: target.machineId,
    maxPreviewDurationSec: 6,
    previewBpm: target.detail?.bpm ?? args.entry.bpm,
    valueSource: 'stored-entry',
  });
  const bpm = target.detail?.bpm ?? args.entry.bpm ?? 108;
  const bars = target.detail?.bars ?? snapshot.materialExport.bars ?? args.entry.bars;
  const durationSec = Math.max(0.25, artifact.durationSec || bars * 4 * (60 / Math.max(1, bpm)));
  const detail: CarrierIntegralPinkExportDetail = {
    ...(target.detail ?? {}),
    entryId: args.entry.id,
    materialName: target.detail?.materialName ?? args.entry.name,
    carrierProjectId: target.project.id,
    machineId: target.machineId,
    prism: target.detail?.prism ?? carrierPrismDisplayName(target.machineId),
    bars,
    bpm,
    rootHz: artifact.baseHz,
    durationSec,
    config: artifact.config ?? null,
    carrierIntegralTimbre: artifact.config?.synthPatch?.carrierIntegralTimbre ?? null,
    projectionMode: args.variant,
    targetId: 'melodic-pink-export',
    planReason: artifact.reason,
    noteCount: artifact.noteCount,
    trackCount: artifact.trackCount,
    branchALineTrafficCount: artifact.branchALineTrafficCount,
    b573WindowCount: artifact.b573WindowCount,
    intervalWindowCount: artifact.intervalWindowCount,
  };
  if (!isCarrierIntegralMelodicPinkDetailReady(detail)) {
    return {
      ok: false,
      projectName: target.project.name,
      reason: `Fretless-Pinkspurplan weiterhin nicht bereit · ${artifact.reason}`,
    };
  }
  return {
    ok: true,
    detail,
    projectName: target.project.name,
    reason: artifact.reason,
  };
}

export function createAudioPaintEditorIntentForEntry(entry: MaterialImportEntrySummary, projects: ForgeProjectMeta[]) {
  const target = resolveAudioPaintRepairTarget(entry, projects);
  const detail = entry.audioPaintRepairDetail ?? entry.audioPaintDetail ?? null;
  return createCarrierIntegralEditorIntent({
    reason: 'missing-pink-plan',
    materialEntryId: entry.id,
    materialName: detail?.materialName ?? entry.name,
    carrierProjectId: target?.project.id ?? detail?.carrierProjectId,
    carrierProjectName: target?.project.name ?? detail?.materialName ?? normalizeMaterialProjectName(entry.name),
    machineId: target?.machineId ?? detail?.machineId,
    prism: detail?.prism ?? (target?.machineId ? carrierPrismDisplayName(target.machineId) : undefined),
    focusTarget: 'melodic-pink-send',
  });
}
