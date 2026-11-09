import type { Forge3PreviewField } from '../../forge3/bodyField'
import type { AudioSourceAsset } from '../audio/AudioImporter'
import type { SpectralData } from '../audio/SpectralData'
import type { MediatedAudioBody } from './mediatedAudioBodyTypes'
import { buildCarrierPresenceInterpretationBridge } from '../interpretation/carrierPresenceInterpretationField'

function emptyArray(size: number) {
  return new Float32Array(size)
}

function sourceAssetIdOf(sourceAsset?: AudioSourceAsset | null): string | null {
  if (!sourceAsset) return null
  return `${sourceAsset.fileName}:${sourceAsset.importStartSec}:${sourceAsset.importDurationSec}:${sourceAsset.sampleRate}`
}

function buildFormFirstMaterialCharacter(scratchSpectral: SpectralData) {
  const width = scratchSpectral.width
  const height = scratchSpectral.height
  const size = width * height
  const bodyBias = emptyArray(size)
  const airBias = emptyArray(size)
  const impactBias = emptyArray(size)
  const traceBias = emptyArray(size)

  for (let y = 0; y < height; y++) {
    const yNorm = height <= 1 ? 0.5 : y / Math.max(1, height - 1)
    const lowBand = 1 - yNorm
    const highBand = yNorm
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const amp = scratchSpectral.data[idx] ?? 0
      const grain = scratchSpectral.grainData[idx] ?? 0.5
      if (amp <= 0.0001) continue
      bodyBias[idx] = Math.min(1, amp * (0.35 + grain * 0.55 + lowBand * 0.2))
      airBias[idx] = Math.min(1, amp * (0.12 + (1 - grain) * 0.5 + highBand * 0.35))
      impactBias[idx] = Math.min(1, amp * (0.18 + (1 - grain) * 0.7))
      traceBias[idx] = Math.min(1, amp * (0.06 + Math.abs(0.5 - grain) * 0.4 + highBand * 0.08))
    }
  }

  return { bodyBias, airBias, impactBias, traceBias }
}

export function buildBodyFromForgeMainPath(
  spectralData: SpectralData,
  forge3Field: Forge3PreviewField | null | undefined,
  sourceAsset?: AudioSourceAsset | null,
): MediatedAudioBody {
  const width = spectralData.width
  const height = spectralData.height
  const bridge = buildCarrierPresenceInterpretationBridge(spectralData, forge3Field)

  return {
    id: `body_source_${Date.now()}`,

    resolution: { width, height },

    shapeMask: bridge.presence.energy,
    materialMass: forge3Field?.bodyMass ?? bridge.presence.energy,

    provenance: {
      sourceTime: bridge.interpretation.sourceTime,
      sourceBand: bridge.interpretation.sourceBand,
      sourceWeight: bridge.interpretation.sourceWeight,
      sourceId: sourceAssetIdOf(sourceAsset),
    },

    materialCharacter: {
      bodyBias: bridge.interpretation.bodyBias,
      airBias: bridge.interpretation.airBias,
      impactBias: bridge.interpretation.impactBias,
      traceBias: bridge.interpretation.traceBias,
    },

    grain: spectralData.grainData,

    state: {
      visibility: 'active',
      audibility: 'active',
      origin: 'source_first',
    },

    derivation: {
      sourceAssetId: sourceAssetIdOf(sourceAsset),
      pipelineVersion: 'v1_presence_interpretation_bridge',
    },
  }
}

export function buildBodyFromCarrierDonor(
  scratchSpectral: SpectralData,
  carrierId?: string,
  donorId?: string,
  signatureId?: string,
): MediatedAudioBody {
  const width = scratchSpectral.width
  const height = scratchSpectral.height
  const size = width * height
  const materialCharacter = buildFormFirstMaterialCharacter(scratchSpectral)

  return {
    id: `body_form_${Date.now()}`,

    resolution: { width, height },

    shapeMask: scratchSpectral.data,
    materialMass: scratchSpectral.data,

    provenance: {
      sourceTime: emptyArray(size),
      sourceBand: emptyArray(size),
      sourceWeight: emptyArray(size),
    },

    materialCharacter,

    grain: scratchSpectral.grainData,

    state: {
      visibility: 'active',
      audibility: 'active',
      origin: 'form_first',
    },

    derivation: {
      carrierId,
      donorId,
      signatureId,
      pipelineVersion: 'v1_phaseA',
    },
  }
}
