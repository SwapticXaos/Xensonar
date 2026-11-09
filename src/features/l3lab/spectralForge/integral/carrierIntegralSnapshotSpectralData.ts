import { SpectralData } from '../audio/SpectralData';
import type { ForgeProjectSnapshot } from '../state/storeTypes';

export const CARRIER_INTEGRAL_PROJECT_SNAPSHOT_SPECTRAL_HEIGHT = 512;
export const CARRIER_INTEGRAL_PROJECT_SNAPSHOT_LEGACY_WIDTH = 2048;

export type CarrierIntegralProjectSnapshotSpectralWidthMode =
  | 'inferred-width'
  | 'legacy-fixed-width';

export type CarrierIntegralProjectSnapshotSpectralDataOptions = {
  widthMode?: CarrierIntegralProjectSnapshotSpectralWidthMode;
  fixedWidth?: number;
  height?: number;
};

export type CarrierIntegralProjectSnapshotSpectralDimensions = {
  width: number;
  height: number;
  widthMode: CarrierIntegralProjectSnapshotSpectralWidthMode;
};

export function toCarrierIntegralFloat32Array(value: unknown): Float32Array {
  if (value instanceof Float32Array) return value;
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return new Float32Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
  }
  if (value instanceof ArrayBuffer) return new Float32Array(value);
  if (Array.isArray(value)) return new Float32Array(value.map((item) => Number(item) || 0));
  return new Float32Array(
    CARRIER_INTEGRAL_PROJECT_SNAPSHOT_LEGACY_WIDTH *
      CARRIER_INTEGRAL_PROJECT_SNAPSHOT_SPECTRAL_HEIGHT *
      2,
  );
}

export function inferCarrierIntegralSpectralSnapshotWidth(
  raw: Float32Array,
  height = CARRIER_INTEGRAL_PROJECT_SNAPSHOT_SPECTRAL_HEIGHT,
): number {
  const safeHeight = Math.max(1, Math.round(Number.isFinite(height) ? height : CARRIER_INTEGRAL_PROJECT_SNAPSHOT_SPECTRAL_HEIGHT));
  const cellCount = raw.length >= CARRIER_INTEGRAL_PROJECT_SNAPSHOT_LEGACY_WIDTH * safeHeight * 2
    ? raw.length / 2
    : raw.length;
  const inferredWidth = cellCount > 0 && cellCount % safeHeight === 0
    ? cellCount / safeHeight
    : CARRIER_INTEGRAL_PROJECT_SNAPSHOT_LEGACY_WIDTH;
  return Math.max(8, Math.round(inferredWidth));
}

export function resolveCarrierIntegralProjectSnapshotSpectralDimensions(
  raw: Float32Array,
  options: CarrierIntegralProjectSnapshotSpectralDataOptions = {},
): CarrierIntegralProjectSnapshotSpectralDimensions {
  const height = Math.max(
    1,
    Math.round(
      Number.isFinite(options.height ?? NaN)
        ? Number(options.height)
        : CARRIER_INTEGRAL_PROJECT_SNAPSHOT_SPECTRAL_HEIGHT,
    ),
  );
  const widthMode = options.widthMode ?? 'inferred-width';
  const fixedWidth = Math.max(
    8,
    Math.round(
      Number.isFinite(options.fixedWidth ?? NaN)
        ? Number(options.fixedWidth)
        : CARRIER_INTEGRAL_PROJECT_SNAPSHOT_LEGACY_WIDTH,
    ),
  );
  return {
    width: widthMode === 'legacy-fixed-width'
      ? fixedWidth
      : inferCarrierIntegralSpectralSnapshotWidth(raw, height),
    height,
    widthMode,
  };
}

export function buildSpectralDataFromProjectSnapshot(
  snapshot: ForgeProjectSnapshot,
  options: CarrierIntegralProjectSnapshotSpectralDataOptions = {},
): SpectralData {
  const raw = toCarrierIntegralFloat32Array(snapshot.spectralSnapshot);
  const dimensions = resolveCarrierIntegralProjectSnapshotSpectralDimensions(raw, options);
  const spectral = new SpectralData(dimensions.width, dimensions.height);
  spectral.restoreData(raw);
  return spectral;
}
