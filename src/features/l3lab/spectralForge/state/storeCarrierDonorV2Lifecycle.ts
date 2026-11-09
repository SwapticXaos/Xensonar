import type {
  AnchorBindingPreview,
  AnchorBindingPreviewSummary,
  AnchorRelativeTimbreTensor,
  CarrierAnchorContinuityGraph,
  CarrierAnchorContinuitySummary,
  CarrierSpectralSkeleton,
  CarrierSpectralSkeletonSummary,
  DonorAnchor,
  DonorTimbreAnalysisSummary,
  DonorTimbreAtlas,
  DonorTimbreAtlasSummary,
} from '../types/carrierDonorV2Types';
import type {
  GestaltField,
  GestaltFieldSummary,
  MaterialAllocationPreview,
  MaterialAllocationSummary,
  MaterialField,
  MaterialFieldSummary,
} from '../types/gestaltMaterialField';
import type { TransferMacroAxes, TransferProfilePresetId } from '../types/transferProfile';
import type { CarrierDonorV2DonorUseMode } from '../types/carrierDonorV2RenderPolicy';
import { deriveTransferProfile, getTransferMacroAxesForPreset, mergeTransferMacroAxes } from '../transfer/deriveTransferProfile';
import type { CarrierDonorV2State, V2Fingerprint } from './storeCarrierDonorV2Types';
import { deriveCarrierDonorV2Eligibility } from './storeCarrierDonorV2Boundary';
import { invalidateCarrierDonorV2FreshnessTree } from './storeCarrierDonorV2FreshnessGraph';

function withDerivedRenderEligibility(next: CarrierDonorV2State): CarrierDonorV2State {
  next.freshness.renderEligibility = deriveCarrierDonorV2Eligibility(next);
  return next;
}

export function markCarrierV2DirtyState(
  current: CarrierDonorV2State,
  fingerprint: V2Fingerprint,
  reason = 'Werkbank wurde verändert.'
): CarrierDonorV2State {
  const invalidatedFreshness = invalidateCarrierDonorV2FreshnessTree(current, 'carrierInput', {
    skeleton: reason,
    continuity: current.continuityGraph
      ? 'Kontinuität ist nicht mehr synchron mit dem Carrier-Skelett.'
      : 'Noch keine Kontinuitätsanalyse vorhanden.',
    binding: 'Zuordnung muss nach Carrier-Änderung neu abgeleitet werden.',
    gestaltField: current.gestaltField
      ? 'Gestaltfeld ist nicht mehr synchron mit dem Carrier-Skelett.'
      : 'Noch kein Gestaltfeld vorhanden.',
    materialAllocation: current.materialAllocationPreview
      ? 'Materialallokation muss nach Carrier-Änderung neu abgeleitet werden.'
      : 'Noch keine Materialallokation vorhanden.',
  });
  const next: CarrierDonorV2State = {
    ...current,
    freshness: {
      ...invalidatedFreshness,
      carrierInput: fingerprint,
    },
  };
  return withDerivedRenderEligibility(next);
}

export function markDonorV2DirtyState(
  current: CarrierDonorV2State,
  fingerprint: V2Fingerprint | null,
  reason = 'Donorquelle wurde verändert.'
): CarrierDonorV2State {
  const invalidatedFreshness = invalidateCarrierDonorV2FreshnessTree(current, 'donorInput', {
    donorAnalysis: reason,
    donorAtlas: current.donorAtlas
      ? 'Atlas muss nach Donor-Wechsel neu abgeleitet werden.'
      : 'Noch kein Donor-Atlas vorhanden.',
    binding: 'Zuordnung muss nach Donor-Wechsel neu abgeleitet werden.',
    materialField: current.materialField
      ? 'Materialfeld ist nicht mehr synchron mit dem Donor-Atlas.'
      : 'Noch kein Materialfeld vorhanden.',
    materialAllocation: current.materialAllocationPreview
      ? 'Materialallokation muss nach Donor-Wechsel neu abgeleitet werden.'
      : 'Noch keine Materialallokation vorhanden.',
  });
  const next: CarrierDonorV2State = {
    ...current,
    freshness: {
      ...invalidatedFreshness,
      donorInput: fingerprint,
    },
  };
  return withDerivedRenderEligibility(next);
}

export function beginCarrierSkeletonBuildState(
  current: CarrierDonorV2State,
  fingerprint: V2Fingerprint
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    busy: 'carrier',
    freshness: {
      ...current.freshness,
      carrierInput: fingerprint,
      skeletonMeta: {
        ...current.freshness.skeletonMeta,
        status: 'building',
        reason: 'Carrier-Skelett wird berechnet …',
        lastError: null,
      },
      continuityMeta: {
        ...current.freshness.continuityMeta,
        status: 'building',
        reason: 'Kontinuitätsgraph wird berechnet …',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function finishCarrierSkeletonBuildState(
  current: CarrierDonorV2State,
  fingerprint: V2Fingerprint,
  skeleton: CarrierSpectralSkeleton,
  summary: CarrierSpectralSkeletonSummary,
  continuityGraph: CarrierAnchorContinuityGraph | null,
  continuitySummary: CarrierAnchorContinuitySummary | null
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    skeleton,
    summary,
    continuityGraph,
    continuitySummary,
    gestaltField: null,
    gestaltFieldSummary: null,
    materialAllocationPreview: null,
    materialAllocationSummary: null,
    // Diagnose-Overlays niemals automatisch aktivieren.
    // Die Werkbankansicht bleibt standardmäßig das echte Malfeld;
    // Carrier-/Kontinuitätsdiagnose wird nur auf expliziten Toggle gezeigt.
    overlayVisible: current.overlayVisible,
    continuityOverlayVisible: current.continuityOverlayVisible,
    busy: 'none',
    freshness: {
      ...current.freshness,
      carrierInput: fingerprint,
      skeletonMeta: {
        status: 'ready',
        fingerprint,
        reason: 'Carrier-Skelett ist aktuell.',
        lastError: null,
      },
      continuityMeta: continuityGraph
        ? {
            status: 'ready',
            fingerprint,
            reason: 'Kontinuitätsgraph ist aktuell.',
            lastError: null,
          }
        : {
            status: 'missing',
            fingerprint: null,
            reason: 'Kein Kontinuitätsgraph verfügbar.',
            lastError: null,
          },
      bindingMeta: {
        ...current.freshness.bindingMeta,
        status: current.donorAtlas ? 'dirty' : 'missing',
        reason: current.donorAtlas
          ? 'Binding muss nach neuer Carrier-Analyse neu berechnet werden.'
          : 'Binding noch nicht möglich: Donor-Atlas fehlt.',
        lastError: null,
      },
      gestaltFieldMeta: {
        status: 'missing',
        fingerprint: null,
        reason: 'Gestaltfeld muss aus dem neuen Carrier-Skelett aufgebaut werden.',
        lastError: null,
      },
      materialAllocationMeta: {
        status: 'missing',
        fingerprint: null,
        reason: 'Materialallokation braucht ein aktuelles Gestaltfeld.',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function failCarrierSkeletonBuildState(
  current: CarrierDonorV2State,
  message: string
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    busy: 'none',
    freshness: {
      ...current.freshness,
      skeletonMeta: {
        ...current.freshness.skeletonMeta,
        status: 'error',
        reason: 'Carrier-Skelett konnte nicht berechnet werden.',
        lastError: message,
      },
      continuityMeta: {
        ...current.freshness.continuityMeta,
        status: 'error',
        reason: 'Kontinuitätsgraph konnte nicht berechnet werden.',
        lastError: message,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function beginDonorAnalysisBuildState(
  current: CarrierDonorV2State,
  fingerprint: V2Fingerprint
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    busy: 'donor',
    freshness: {
      ...current.freshness,
      donorInput: fingerprint,
      donorAnalysisMeta: {
        ...current.freshness.donorAnalysisMeta,
        status: 'building',
        reason: 'Donor-Analyse wird berechnet …',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function finishDonorAnalysisBuildState(
  current: CarrierDonorV2State,
  fingerprint: V2Fingerprint,
  donorAnchors: DonorAnchor[],
  donorTensor: AnchorRelativeTimbreTensor,
  donorSummary: DonorTimbreAnalysisSummary
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    donorAnchors,
    donorTensor,
    donorSummary,
    donorAtlas: null,
    donorAtlasSummary: null,
    materialField: null,
    materialFieldSummary: null,
    materialAllocationPreview: null,
    materialAllocationSummary: null,
    bindingPreview: [],
    bindingSummary: null,
    bindingOverlayVisible: false,
    busy: 'none',
    freshness: {
      ...current.freshness,
      donorInput: fingerprint,
      donorAnalysisMeta: {
        status: 'ready',
        fingerprint,
        reason: 'Donor-Analyse ist aktuell.',
        lastError: null,
      },
      donorAtlasMeta: {
        status: 'missing',
        fingerprint: null,
        reason: 'Atlas muss aus der neuen Donor-Analyse neu gebildet werden.',
        lastError: null,
      },
      materialFieldMeta: {
        status: 'missing',
        fingerprint: null,
        reason: 'Materialfeld braucht einen aktuellen Donor-Atlas.',
        lastError: null,
      },
      materialAllocationMeta: {
        status: 'missing',
        fingerprint: null,
        reason: 'Materialallokation braucht ein aktuelles Materialfeld.',
        lastError: null,
      },
      bindingMeta: {
        status: 'missing',
        fingerprint: null,
        reason: 'Binding braucht einen aktuellen Donor-Atlas.',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function failDonorAnalysisBuildState(
  current: CarrierDonorV2State,
  message: string
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    busy: 'none',
    freshness: {
      ...current.freshness,
      donorAnalysisMeta: {
        ...current.freshness.donorAnalysisMeta,
        status: 'error',
        reason: 'Donor-Analyse konnte nicht berechnet werden.',
        lastError: message,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function beginDonorAtlasBuildState(current: CarrierDonorV2State): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    busy: 'donor',
    freshness: {
      ...current.freshness,
      donorAtlasMeta: {
        ...current.freshness.donorAtlasMeta,
        status: 'building',
        reason: 'Donor-Atlas wird gebildet …',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function finishDonorAtlasBuildState(
  current: CarrierDonorV2State,
  donorAtlas: DonorTimbreAtlas,
  donorAtlasSummary: DonorTimbreAtlasSummary
): CarrierDonorV2State {
  const fp = current.freshness.donorInput;
  const next: CarrierDonorV2State = {
    ...current,
    donorAtlas,
    donorAtlasSummary,
    materialField: null,
    materialFieldSummary: null,
    materialAllocationPreview: null,
    materialAllocationSummary: null,
    bindingPreview: [],
    bindingSummary: null,
    bindingOverlayVisible: false,
    busy: 'none',
    freshness: {
      ...current.freshness,
      donorAtlasMeta: {
        status: 'ready',
        fingerprint: fp,
        reason: 'Donor-Atlas ist aktuell.',
        lastError: null,
      },
      materialFieldMeta: {
        status: 'missing',
        fingerprint: null,
        reason: 'Materialfeld muss aus dem aktuellen Donor-Atlas aufgebaut werden.',
        lastError: null,
      },
      materialAllocationMeta: {
        status: 'missing',
        fingerprint: null,
        reason: 'Materialallokation braucht ein aktuelles Materialfeld.',
        lastError: null,
      },
      bindingMeta: {
        status: current.skeleton ? 'dirty' : 'missing',
        fingerprint: null,
        reason: current.skeleton
          ? 'Binding muss auf dem aktuellen Atlas neu berechnet werden.'
          : 'Binding noch nicht möglich: Carrier-Skelett fehlt.',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function failDonorAtlasBuildState(
  current: CarrierDonorV2State,
  message: string
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    busy: 'none',
    freshness: {
      ...current.freshness,
      donorAtlasMeta: {
        ...current.freshness.donorAtlasMeta,
        status: 'error',
        reason: 'Donor-Atlas konnte nicht gebildet werden.',
        lastError: message,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function beginGestaltFieldBuildState(current: CarrierDonorV2State): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    freshness: {
      ...current.freshness,
      gestaltFieldMeta: {
        ...current.freshness.gestaltFieldMeta,
        status: 'building',
        reason: 'Gestaltfeld wird aufgebaut …',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function finishGestaltFieldBuildState(
  current: CarrierDonorV2State,
  gestaltField: GestaltField,
  gestaltFieldSummary: GestaltFieldSummary
): CarrierDonorV2State {
  const fp = current.freshness.skeletonMeta.fingerprint;
  const next: CarrierDonorV2State = {
    ...current,
    gestaltField,
    gestaltFieldSummary,
    materialAllocationPreview: null,
    materialAllocationSummary: null,
    freshness: {
      ...current.freshness,
      gestaltFieldMeta: {
        status: 'ready',
        fingerprint: fp,
        reason: 'Gestaltfeld ist aktuell.',
        lastError: null,
      },
      materialAllocationMeta: {
        status: current.materialField ? 'dirty' : 'missing',
        fingerprint: null,
        reason: current.materialField
          ? 'Materialallokation muss mit dem aktuellen Gestaltfeld neu berechnet werden.'
          : 'Materialallokation braucht ein Materialfeld.',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function failGestaltFieldBuildState(
  current: CarrierDonorV2State,
  message: string
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    freshness: {
      ...current.freshness,
      gestaltFieldMeta: {
        ...current.freshness.gestaltFieldMeta,
        status: 'error',
        reason: 'Gestaltfeld konnte nicht aufgebaut werden.',
        lastError: message,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function beginMaterialFieldBuildState(current: CarrierDonorV2State): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    freshness: {
      ...current.freshness,
      materialFieldMeta: {
        ...current.freshness.materialFieldMeta,
        status: 'building',
        reason: 'Materialfeld wird aufgebaut …',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function finishMaterialFieldBuildState(
  current: CarrierDonorV2State,
  materialField: MaterialField,
  materialFieldSummary: MaterialFieldSummary
): CarrierDonorV2State {
  const fp = current.freshness.donorAtlasMeta.fingerprint;
  const next: CarrierDonorV2State = {
    ...current,
    materialField,
    materialFieldSummary,
    materialAllocationPreview: null,
    materialAllocationSummary: null,
    freshness: {
      ...current.freshness,
      materialFieldMeta: {
        status: 'ready',
        fingerprint: fp,
        reason: 'Materialfeld ist aktuell.',
        lastError: null,
      },
      materialAllocationMeta: {
        status: current.gestaltField ? 'dirty' : 'missing',
        fingerprint: null,
        reason: current.gestaltField
          ? 'Materialallokation muss mit dem aktuellen Materialfeld neu berechnet werden.'
          : 'Materialallokation braucht ein Gestaltfeld.',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function failMaterialFieldBuildState(
  current: CarrierDonorV2State,
  message: string
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    freshness: {
      ...current.freshness,
      materialFieldMeta: {
        ...current.freshness.materialFieldMeta,
        status: 'error',
        reason: 'Materialfeld konnte nicht aufgebaut werden.',
        lastError: message,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function beginMaterialAllocationBuildState(current: CarrierDonorV2State): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    freshness: {
      ...current.freshness,
      materialAllocationMeta: {
        ...current.freshness.materialAllocationMeta,
        status: 'building',
        reason: 'Materialallokation wird berechnet …',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function finishMaterialAllocationBuildState(
  current: CarrierDonorV2State,
  materialAllocationPreview: MaterialAllocationPreview,
  materialAllocationSummary: MaterialAllocationSummary
): CarrierDonorV2State {
  const gestaltFp = current.freshness.gestaltFieldMeta.fingerprint;
  const materialFp = current.freshness.materialFieldMeta.fingerprint;
  const fp = gestaltFp && materialFp
    ? { key: `materialAllocation:${gestaltFp.key}:${materialFp.key}`, updatedAt: Date.now() }
    : null;
  const next: CarrierDonorV2State = {
    ...current,
    materialAllocationPreview,
    materialAllocationSummary,
    freshness: {
      ...current.freshness,
      materialAllocationMeta: {
        status: 'ready',
        fingerprint: fp,
        reason: 'Materialallokation ist aktuell.',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function failMaterialAllocationBuildState(
  current: CarrierDonorV2State,
  message: string
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    freshness: {
      ...current.freshness,
      materialAllocationMeta: {
        ...current.freshness.materialAllocationMeta,
        status: 'error',
        reason: 'Materialallokation konnte nicht berechnet werden.',
        lastError: message,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function beginBindingBuildState(current: CarrierDonorV2State): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    busy: 'binding',
    freshness: {
      ...current.freshness,
      bindingMeta: {
        ...current.freshness.bindingMeta,
        status: 'building',
        reason: 'Binding-Vorschau wird berechnet …',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function finishBindingBuildState(
  current: CarrierDonorV2State,
  bindingPreview: AnchorBindingPreview[],
  bindingSummary: AnchorBindingPreviewSummary
): CarrierDonorV2State {
  const carrierFp = current.freshness.skeletonMeta.fingerprint;
  const donorFp = current.freshness.donorAtlasMeta.fingerprint;
  const bindingFp =
    carrierFp && donorFp
      ? { key: `binding:${carrierFp.key}:${donorFp.key}`, updatedAt: Date.now() }
      : null;
  const next: CarrierDonorV2State = {
    ...current,
    bindingPreview,
    bindingSummary,
    // Auch Binding-/Materialdiagnose nur explizit sichtbar machen.
    bindingOverlayVisible: current.bindingOverlayVisible,
    busy: 'none',
    freshness: {
      ...current.freshness,
      bindingMeta: {
        status: 'ready',
        fingerprint: bindingFp,
        reason: 'Binding-Vorschau ist aktuell.',
        lastError: null,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function failBindingBuildState(
  current: CarrierDonorV2State,
  message: string
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    busy: 'none',
    freshness: {
      ...current.freshness,
      bindingMeta: {
        ...current.freshness.bindingMeta,
        status: 'error',
        reason: 'Binding-Vorschau konnte nicht berechnet werden.',
        lastError: message,
      },
    },
  };
  return withDerivedRenderEligibility(next);
}

export function recomputeCarrierDonorV2EligibilityState(current: CarrierDonorV2State): CarrierDonorV2State {
  return withDerivedRenderEligibility({
    ...current,
    freshness: {
      ...current.freshness,
    },
  });
}

export function setCarrierDonorTransferPresetState(
  current: CarrierDonorV2State,
  presetId: TransferProfilePresetId
): CarrierDonorV2State {
  const transferMacroAxes = getTransferMacroAxesForPreset(presetId);
  const next: CarrierDonorV2State = {
    ...current,
    transferPresetId: presetId,
    transferMacroAxes,
    transferProfile: deriveTransferProfile({ presetId, macro: transferMacroAxes }),
    freshness: invalidateCarrierDonorV2FreshnessTree(current, 'transferProfile', {
      materialAllocation: 'Materialallokation wird mit neuem Transferprofil automatisch neu aufgebaut.',
    }),
  };
  return withDerivedRenderEligibility(next);
}

export function setCarrierDonorTransferMacroAxesState(
  current: CarrierDonorV2State,
  patch: Partial<TransferMacroAxes>
): CarrierDonorV2State {
  const transferMacroAxes = mergeTransferMacroAxes({
    ...current.transferMacroAxes,
    ...patch,
  });
  const next: CarrierDonorV2State = {
    ...current,
    transferPresetId: 'custom',
    transferMacroAxes,
    transferProfile: deriveTransferProfile({
      presetId: 'custom',
      macro: transferMacroAxes,
    }),
    freshness: invalidateCarrierDonorV2FreshnessTree(current, 'transferProfile', {
      materialAllocation: 'Materialallokation wird mit neuen Transferwerten automatisch neu aufgebaut.',
    }),
  };
  return withDerivedRenderEligibility(next);
}

export function setCarrierDonorV2DonorUseModeState(
  current: CarrierDonorV2State,
  mode: CarrierDonorV2DonorUseMode
): CarrierDonorV2State {
  const next: CarrierDonorV2State = {
    ...current,
    donorUseMode: mode,
  };
  return withDerivedRenderEligibility(next);
}
