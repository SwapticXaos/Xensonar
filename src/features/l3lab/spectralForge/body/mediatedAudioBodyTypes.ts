export type BodyOriginMode = 'source_first' | 'form_first' | 'hybrid'

export type VisibilityMode = 'active' | 'trace' | 'hidden'
export type AudibilityMode = 'active' | 'muted'

export interface MediatedAudioBody {
  id: string

  resolution: {
    width: number
    height: number
  }

  // Form / Belegung
  shapeMask: Float32Array
  materialMass: Float32Array

  // Herkunft
  provenance: {
    sourceTime: Float32Array
    sourceBand: Float32Array
    sourceWeight: Float32Array
    sourceId?: string | null
  }

  // Materialcharakter
  materialCharacter: {
    bodyBias: Float32Array
    airBias: Float32Array
    impactBias: Float32Array
    traceBias: Float32Array
  }

  // optional
  grain?: Float32Array

  // Zustand
  state: {
    visibility: VisibilityMode
    audibility: AudibilityMode
    origin: BodyOriginMode
  }

  // Ableitung
  derivation: {
    sourceAssetId?: string | null
    carrierId?: string | null
    donorId?: string | null
    signatureId?: string | null
    pipelineVersion: string
    timeMode?: 'carrier_master' | 'donor_master' | 'locked_ratio'
    carrierDurationSec?: number
    donorMaterialDurationSec?: number
    renderDurationSec?: number
    carrierVoiceCount?: number
    embodiedVoiceCount?: number
    donorInstrumentMode?: string
  }
}
