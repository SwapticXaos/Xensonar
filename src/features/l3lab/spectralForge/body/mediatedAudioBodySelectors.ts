import type { MediatedAudioBody } from './mediatedAudioBodyTypes'

export type MediatedAudioBodySummary = {
  origin: MediatedAudioBody['state']['origin']
  width: number
  height: number
  hasProvenance: boolean
  hasCharacter: boolean
  hasTrace: boolean
  traceStrength: number
}

function hasAnySignal(values: Float32Array | undefined) {
  if (!values || values.length === 0) return false
  const stride = Math.max(1, Math.floor(values.length / 256))
  for (let i = 0; i < values.length; i += stride) {
    if ((values[i] ?? 0) > 0.0001) return true
  }
  return false
}

function computeTraceStrength(body: MediatedAudioBody) {
  const values = body.materialCharacter.traceBias
  const weights = body.provenance.sourceWeight
  if ((!values || values.length === 0) && (!weights || weights.length === 0)) return 0
  const length = Math.min(values?.length ?? 0, weights?.length ?? 0) || Math.max(values?.length ?? 0, weights?.length ?? 0)
  const stride = Math.max(1, Math.floor(length / 512))
  let peak = 0
  for (let i = 0; i < length; i += stride) {
    const trace = values?.[i] ?? 0
    const sourceWeight = weights?.[i] ?? 0
    const v = Math.max(trace, sourceWeight * 0.25)
    if (v > peak) peak = v
  }
  return peak
}

export function getBodyActiveVisibilityMask(body: MediatedAudioBody, threshold = 0.003) {
  const { shapeMask } = body
  const length = shapeMask.length
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const shape = shapeMask[i] ?? 0
    out[i] = shape > threshold ? shape : 0
  }
  return out
}

export function getBodyTraceVisibilityMask(body: MediatedAudioBody, activeThreshold = 0.003, traceThreshold = 0.02) {
  const active = getBodyActiveVisibilityMask(body, activeThreshold)
  const traceBias = body.materialCharacter.traceBias
  const sourceWeight = body.provenance.sourceWeight
  const bodyMass = body.materialMass
  const length = Math.max(traceBias.length, sourceWeight.length, bodyMass.length, active.length)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    if ((active[i] ?? 0) > activeThreshold) {
      out[i] = 0
      continue
    }
    const trace = traceBias[i] ?? 0
    const src = sourceWeight[i] ?? 0
    const mass = bodyMass[i] ?? 0
    const v = Math.max(trace, src * 0.24, mass * 0.12)
    out[i] = v > traceThreshold ? Math.min(1, v) : 0
  }
  return out
}

export function hasBodyTrace(body: MediatedAudioBody) {
  return computeTraceStrength(body) > 0.02
}

export function summarizeBody(body: MediatedAudioBody): MediatedAudioBodySummary {
  const traceStrength = computeTraceStrength(body)
  return {
    origin: body.state.origin,
    width: body.resolution.width,
    height: body.resolution.height,
    hasProvenance:
      hasAnySignal(body.provenance.sourceTime) ||
      hasAnySignal(body.provenance.sourceBand) ||
      hasAnySignal(body.provenance.sourceWeight),
    hasCharacter:
      hasAnySignal(body.materialCharacter.bodyBias) ||
      hasAnySignal(body.materialCharacter.airBias) ||
      hasAnySignal(body.materialCharacter.impactBias) ||
      hasAnySignal(body.materialCharacter.traceBias),
    hasTrace: traceStrength > 0.02,
    traceStrength,
  }
}
