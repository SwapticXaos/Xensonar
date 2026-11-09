import type { AudioSourceAsset } from '../spectralForge/audio/AudioImporter';
import type { SpectralData, StampData, StampTransform } from '../spectralForge/audio/SpectralData';

type Forge3StampMeta = {
  width: number;
  height: number;
  bodyMass: Float32Array;
  sourceTime: Float32Array;
  sourceBand: Float32Array;
  sourceWeight: Float32Array;
  bodyBias: Float32Array;
  airBias: Float32Array;
  impactBias: Float32Array;
  traceBias: Float32Array;
};

export type Forge3FieldSummary = {
  activeCells: number;
  avgSourceWeight: number;
  avgTrace: number;
  latentCells: number;
};


export type Forge3PreviewField = {
  width: number;
  height: number;
  bodyMass: Float32Array;
  sourceTime: Float32Array;
  sourceBand: Float32Array;
  sourceWeight: Float32Array;
  bodyBias: Float32Array;
  airBias: Float32Array;
  impactBias: Float32Array;
  traceBias: Float32Array;
};


export type Forge3StampMetaSnapshot = {
  width: number;
  height: number;
  bodyMass: Float32Array;
  sourceTime: Float32Array;
  sourceBand: Float32Array;
  sourceWeight: Float32Array;
  bodyBias: Float32Array;
  airBias: Float32Array;
  impactBias: Float32Array;
  traceBias: Float32Array;
};

export type Forge3BodyFieldSnapshot = {
  width: number;
  height: number;
  bodyMass: Float32Array;
  sourceTime: Float32Array;
  sourceBand: Float32Array;
  sourceWeight: Float32Array;
  bodyBias: Float32Array;
  airBias: Float32Array;
  impactBias: Float32Array;
  traceBias: Float32Array;
  initialized: boolean;
  sourceSignature: string;
  stampMeta: Forge3StampMetaSnapshot | null;
};

export type Forge3CellDescription = {
  sourceWeight: number;
  sourceTime: number;
  sourceBand: number;
  classLabel: 'body' | 'air' | 'impact' | 'trace';
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothPeak(v: number) {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
}

type Forge3SyncMode = 'reseed' | 'preserve';

class Forge3BodyField {
  width = 0;
  height = 0;
  bodyMass = new Float32Array(0);
  sourceTime = new Float32Array(0);
  sourceBand = new Float32Array(0);
  sourceWeight = new Float32Array(0);
  bodyBias = new Float32Array(0);
  airBias = new Float32Array(0);
  impactBias = new Float32Array(0);
  traceBias = new Float32Array(0);
  initialized = false;
  sourceSignature = 'none';
  stampMeta: Forge3StampMeta | null = null;

  private resize(width: number, height: number) {
    if (this.width === width && this.height === height && this.bodyMass.length === width * height) return;
    this.width = width;
    this.height = height;
    this.bodyMass = new Float32Array(width * height);
    this.sourceTime = new Float32Array(width * height);
    this.sourceBand = new Float32Array(width * height);
    this.sourceWeight = new Float32Array(width * height);
    this.bodyBias = new Float32Array(width * height);
    this.airBias = new Float32Array(width * height);
    this.impactBias = new Float32Array(width * height);
    this.traceBias = new Float32Array(width * height);
  }

  clear() {
    this.width = 0;
    this.height = 0;
    this.bodyMass = new Float32Array(0);
    this.sourceTime = new Float32Array(0);
    this.sourceBand = new Float32Array(0);
    this.sourceWeight = new Float32Array(0);
    this.bodyBias = new Float32Array(0);
    this.airBias = new Float32Array(0);
    this.impactBias = new Float32Array(0);
    this.traceBias = new Float32Array(0);
    this.initialized = false;
    this.sourceSignature = 'none';
    this.stampMeta = null;
  }

  private getIndex(x: number, y: number) {
    return y * this.width + x;
  }

  private sampleBilinear(buf: Float32Array, w: number, h: number, x: number, y: number, fallback = 0) {
    if (x < 0 || x >= w || y < 0 || y >= h) return fallback;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, w - 1);
    const y1 = Math.min(y0 + 1, h - 1);
    const tx = x - x0;
    const ty = y - y0;
    const v00 = buf[y0 * w + x0] ?? fallback;
    const v10 = buf[y0 * w + x1] ?? fallback;
    const v01 = buf[y1 * w + x0] ?? fallback;
    const v11 = buf[y1 * w + x1] ?? fallback;
    return v00 * (1 - tx) * (1 - ty) + v10 * tx * (1 - ty) + v01 * (1 - tx) * ty + v11 * tx * ty;
  }

  private buildSignature(sourceAsset: AudioSourceAsset | null, spectralData: SpectralData) {
    if (!sourceAsset) return `none:${spectralData.width}x${spectralData.height}`;
    return `${sourceAsset.fileName}:${sourceAsset.originalDuration}:${sourceAsset.importStartSec}:${sourceAsset.importDurationSec}:${spectralData.width}x${spectralData.height}`;
  }

  private computeDefaultCellState(x: number, y: number, amp: number) {
    const xNorm = x / Math.max(1, this.width - 1);
    const yNorm = y / Math.max(1, this.height - 1);
    const baseBody = smoothPeak((yNorm - 0.2) / 0.8);
    const baseAir = smoothPeak((0.82 - yNorm) / 0.82);
    return {
      xNorm,
      yNorm,
      bodyBias: clamp01(baseBody * (0.45 + amp * 0.55)),
      airBias: clamp01(baseAir * (0.35 + amp * 0.65)),
      impactBias: clamp01(amp * 0.15),
      traceBias: amp > 0.01 ? 0.06 : 0,
    };
  }

  private reseedCellFromSpectralData(
    spectralData: SpectralData,
    x: number,
    y: number,
    mode: Forge3SyncMode = 'reseed',
  ) {
    const idx = this.getIndex(x, y);
    const amp = spectralData.get(x, y);
    const defaults = this.computeDefaultCellState(x, y, amp);

    this.bodyMass[idx] = amp;
    this.sourceTime[idx] = defaults.xNorm;
    this.sourceBand[idx] = defaults.yNorm;

    if (amp <= 0.0025) {
      this.sourceWeight[idx] = 0;
      this.bodyBias[idx] = 0;
      this.airBias[idx] = 0;
      this.impactBias[idx] = 0;
      this.traceBias[idx] = 0;
      return;
    }

    if (mode === 'preserve') {
      this.sourceWeight[idx] = Math.max(amp, this.sourceWeight[idx] * 0.9);
      this.bodyBias[idx] = Math.max(defaults.bodyBias, this.bodyBias[idx] * 0.8);
      this.airBias[idx] = Math.max(defaults.airBias, this.airBias[idx] * 0.8);
      this.impactBias[idx] = Math.max(defaults.impactBias, this.impactBias[idx] * 0.7);
      this.traceBias[idx] = Math.min(this.traceBias[idx], Math.max(defaults.traceBias, amp * 0.18));
      return;
    }

    this.sourceWeight[idx] = clamp01(amp);
    this.bodyBias[idx] = defaults.bodyBias;
    this.airBias[idx] = defaults.airBias;
    this.impactBias[idx] = defaults.impactBias;
    this.traceBias[idx] = defaults.traceBias;
  }

  ensureInitialized(spectralData: SpectralData, sourceAsset: AudioSourceAsset | null) {
    const signature = this.buildSignature(sourceAsset, spectralData);
    if (!this.initialized || this.width !== spectralData.width || this.height !== spectralData.height || signature !== this.sourceSignature) {
      this.seedFromSpectralData(spectralData, sourceAsset);
    }
  }

  seedFromSpectralData(spectralData: SpectralData, sourceAsset: AudioSourceAsset | null) {
    this.resize(spectralData.width, spectralData.height);
    const transientEnvelope = sourceAsset?.analysisCache?.transientEnvelope;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = this.getIndex(x, y);
        const amp = spectralData.get(x, y);
        const defaults = this.computeDefaultCellState(x, y, amp);
        const transient = transientEnvelope
          ? transientEnvelope[
              Math.max(
                0,
                Math.min(transientEnvelope.length - 1, Math.round(defaults.xNorm * (transientEnvelope.length - 1)))
              )
            ] ?? 0
          : 0;
        this.bodyMass[idx] = amp;
        this.sourceTime[idx] = defaults.xNorm;
        this.sourceBand[idx] = defaults.yNorm;
        this.sourceWeight[idx] = amp > 0.002 ? 1 : 0;
        this.bodyBias[idx] = defaults.bodyBias;
        this.airBias[idx] = defaults.airBias;
        this.impactBias[idx] = clamp01(transient * 0.85 + amp * 0.15);
        this.traceBias[idx] = amp > 0.01 ? 0.14 : 0;
      }
    }
    this.initialized = true;
    this.sourceSignature = this.buildSignature(sourceAsset, spectralData);
  }

  syncRegionFromSpectralData(
    spectralData: SpectralData,
    cx: number,
    cy: number,
    radius: number,
    mode: Forge3SyncMode = 'reseed',
  ) {
    if (!this.initialized) return;
    const r = Math.max(1, Math.ceil(radius + 2));
    const x0 = Math.max(0, cx - r);
    const x1 = Math.min(this.width - 1, cx + r);
    const y0 = Math.max(0, cy - r);
    const y1 = Math.min(this.height - 1, cy + r);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        this.reseedCellFromSpectralData(spectralData, x, y, mode);
      }
    }
  }

  scrubSilentRegionFromSpectralData(spectralData: SpectralData, cx: number, cy: number, radius: number) {
    this.syncRegionFromSpectralData(spectralData, cx, cy, radius, 'preserve');
  }

  captureStampMeta(x: number, y: number, w: number, h: number) {
    if (!this.initialized || w <= 0 || h <= 0) {
      this.stampMeta = null;
      return;
    }
    const bodyMass = new Float32Array(w * h);
    const sourceTime = new Float32Array(w * h);
    const sourceBand = new Float32Array(w * h);
    const sourceWeight = new Float32Array(w * h);
    const bodyBias = new Float32Array(w * h);
    const airBias = new Float32Array(w * h);
    const impactBias = new Float32Array(w * h);
    const traceBias = new Float32Array(w * h);
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const gx = x + dx;
        const gy = y + dy;
        const dst = dy * w + dx;
        if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) continue;
        const src = this.getIndex(gx, gy);
        bodyMass[dst] = this.bodyMass[src];
        sourceTime[dst] = this.sourceTime[src];
        sourceBand[dst] = this.sourceBand[src];
        sourceWeight[dst] = this.sourceWeight[src];
        bodyBias[dst] = this.bodyBias[src];
        airBias[dst] = this.airBias[src];
        impactBias[dst] = this.impactBias[src];
        traceBias[dst] = this.traceBias[src];
      }
    }
    this.stampMeta = { width: w, height: h, bodyMass, sourceTime, sourceBand, sourceWeight, bodyBias, airBias, impactBias, traceBias };
  }

  excavateCapturedRegion(x: number, y: number, w: number, h: number) {
    if (!this.initialized) return;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const gx = x + dx;
        const gy = y + dy;
        if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) continue;
        const idx = this.getIndex(gx, gy);
        this.bodyMass[idx] *= 0.72;
        this.sourceWeight[idx] = Math.max(this.sourceWeight[idx], 0.42);
        this.traceBias[idx] = Math.min(1, this.traceBias[idx] + 0.25);
      }
    }
  }

  pasteCapturedStampMetadata(spectralData: SpectralData, stamp: StampData, cx: number, cy: number, intensity: number, erase: boolean, transform: Partial<StampTransform> = {}) {
    if (!this.stampMeta) {
      this.syncRegionFromSpectralData(spectralData, cx, cy, Math.max(stamp.width, stamp.height) * 0.6);
      return;
    }
    const finalTransform: StampTransform = {
      scaleX: transform.scaleX ?? 1,
      scaleY: transform.scaleY ?? 1,
      rotation: transform.rotation ?? 0,
      flipX: transform.flipX ?? false,
      flipY: transform.flipY ?? false,
    };
    const cosA = Math.cos(finalTransform.rotation);
    const sinA = Math.sin(finalTransform.rotation);
    const a = (stamp.width * Math.abs(finalTransform.scaleX)) / 2;
    const b = (stamp.height * Math.abs(finalTransform.scaleY)) / 2;
    const outHalfW = Math.max(1, Math.ceil(Math.abs(a * cosA) + Math.abs(b * sinA)));
    const outHalfH = Math.max(1, Math.ceil(Math.abs(a * sinA) + Math.abs(b * cosA)));
    const outW = outHalfW * 2;
    const outH = outHalfH * 2;
    const halfW = Math.floor(outW / 2);
    const halfH = Math.floor(outH / 2);

    const safeScaleX = Math.max(0.05, Math.abs(finalTransform.scaleX));
    const safeScaleY = Math.max(0.05, Math.abs(finalTransform.scaleY));
    const flipMulX = finalTransform.flipX ? -1 : 1;
    const flipMulY = finalTransform.flipY ? -1 : 1;
    const cosR = Math.cos(-finalTransform.rotation);
    const sinR = Math.sin(-finalTransform.rotation);
    const srcCenterX = stamp.width / 2;
    const srcCenterY = stamp.height / 2;

    const meta = this.stampMeta;
    for (let dy = 0; dy < outH; dy++) {
      for (let dx = 0; dx < outW; dx++) {
        const outX = dx - halfW;
        const outY = dy - halfH;
        const localX = outX / safeScaleX;
        const localY = outY / safeScaleY;
        const sx = flipMulX * localX;
        const sy = flipMulY * localY;
        const rx = sx * cosR - sy * sinR;
        const ry = sx * sinR + sy * cosR;
        const srcX = rx + srcCenterX;
        const srcY = ry + srcCenterY;
        const maskAmp = spectralData.sampleStampTransformed(stamp, outX, outY, finalTransform).amp;
        if (maskAmp <= 0.001) continue;
        const gx = cx - halfW + dx;
        const gy = cy - halfH + dy;
        if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) continue;
        const idx = this.getIndex(gx, gy);
        const mix = clamp01(maskAmp * intensity);
        const sampledBody = this.sampleBilinear(meta.bodyMass, meta.width, meta.height, srcX, srcY, 0);
        const sampledTime = this.sampleBilinear(meta.sourceTime, meta.width, meta.height, srcX, srcY, gx / Math.max(1, this.width - 1));
        const sampledBand = this.sampleBilinear(meta.sourceBand, meta.width, meta.height, srcX, srcY, gy / Math.max(1, this.height - 1));
        const sampledWeight = this.sampleBilinear(meta.sourceWeight, meta.width, meta.height, srcX, srcY, 0.25);
        const sampledBodyBias = this.sampleBilinear(meta.bodyBias, meta.width, meta.height, srcX, srcY, 0.5);
        const sampledAirBias = this.sampleBilinear(meta.airBias, meta.width, meta.height, srcX, srcY, 0.5);
        const sampledImpact = this.sampleBilinear(meta.impactBias, meta.width, meta.height, srcX, srcY, 0.3);
        const sampledTrace = this.sampleBilinear(meta.traceBias, meta.width, meta.height, srcX, srcY, 0.3);
        if (erase) {
          this.bodyMass[idx] *= 1 - mix;
          this.sourceWeight[idx] = Math.max(this.sourceWeight[idx] * (1 - mix * 0.35), 0.08);
          this.traceBias[idx] = Math.min(1, this.traceBias[idx] + mix * 0.25);
        } else {
          this.bodyMass[idx] = Math.max(this.bodyMass[idx], sampledBody * mix);
          this.sourceTime[idx] = this.sourceTime[idx] * (1 - mix) + sampledTime * mix;
          this.sourceBand[idx] = this.sourceBand[idx] * (1 - mix) + sampledBand * mix;
          this.sourceWeight[idx] = Math.min(1, this.sourceWeight[idx] * (1 - mix * 0.4) + sampledWeight * mix);
          this.bodyBias[idx] = this.bodyBias[idx] * (1 - mix * 0.5) + sampledBodyBias * mix * 0.5;
          this.airBias[idx] = this.airBias[idx] * (1 - mix * 0.5) + sampledAirBias * mix * 0.5;
          this.impactBias[idx] = this.impactBias[idx] * (1 - mix * 0.5) + sampledImpact * mix * 0.5;
          this.traceBias[idx] = Math.max(this.traceBias[idx], sampledTrace * mix);
        }
      }
    }
  }

  applySteinmetz(spectralData: SpectralData, cx: number, cy: number, radius: number, intensity: number, erase: boolean, grainSize: number) {
    if (!this.initialized) return;
    const r = Math.max(1, Math.ceil(radius));
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const gx = cx + dx;
        const gy = cy + dy;
        if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) continue;
        const idx = this.getIndex(gx, gy);
        const falloff = Math.pow(1 - dist / Math.max(1, radius), 2);
        const amp = spectralData.get(gx, gy);
        const bodyEmphasis = 0.65 + this.bodyBias[idx] * 0.55;
        if (erase) {
          const reduction = intensity * falloff * bodyEmphasis;
          const nextAmp = amp * Math.max(0, 1 - reduction);
          spectralData.set(gx, gy, nextAmp);
          spectralData.setGrain(gx, gy, spectralData.getGrain(gx, gy) * (1 - falloff * 0.25) + grainSize * 0.25 * falloff);
          this.bodyMass[idx] = Math.max(this.bodyMass[idx] * 0.88, nextAmp);
          this.sourceWeight[idx] = Math.max(this.sourceWeight[idx] * 0.95, nextAmp > 0.01 ? 0.22 : 0.08);
          this.traceBias[idx] = Math.min(1, this.traceBias[idx] + falloff * 0.18);
        } else {
          const latent = Math.max(this.bodyMass[idx], amp);
          const restore = latent * intensity * falloff * (0.35 + this.sourceWeight[idx] * 0.65);
          const nextAmp = Math.min(1, amp + restore * bodyEmphasis);
          spectralData.set(gx, gy, nextAmp);
          spectralData.setGrain(gx, gy, spectralData.getGrain(gx, gy) * (1 - falloff * 0.3) + grainSize * 0.3 * falloff);
          this.bodyMass[idx] = Math.max(this.bodyMass[idx], nextAmp);
          this.sourceWeight[idx] = Math.min(1, this.sourceWeight[idx] + falloff * 0.08);
        }
      }
    }
  }

  applyMorph(spectralData: SpectralData, cx: number, cy: number, radius: number, amount: number, mode: 'push' | 'bloat' | 'pinch' | 'twirlCW' | 'twirlCCW', dragDX: number, dragDY: number) {
    if (!this.initialized) return;
    const r = Math.max(2, Math.ceil(radius));
    const x0 = Math.max(0, cx - r - 2);
    const y0 = Math.max(0, cy - r - 2);
    const x1 = Math.min(this.width - 1, cx + r + 2);
    const y1 = Math.min(this.height - 1, cy + r + 2);
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;

    const ampSrc = new Float32Array(w * h);
    const grainSrc = new Float32Array(w * h);
    const bodyMassSrc = new Float32Array(w * h);
    const sourceTimeSrc = new Float32Array(w * h);
    const sourceBandSrc = new Float32Array(w * h);
    const sourceWeightSrc = new Float32Array(w * h);
    const bodyBiasSrc = new Float32Array(w * h);
    const airBiasSrc = new Float32Array(w * h);
    const impactBiasSrc = new Float32Array(w * h);
    const traceBiasSrc = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = x0 + x;
        const gy = y0 + y;
        const src = this.getIndex(gx, gy);
        const dst = y * w + x;
        ampSrc[dst] = spectralData.get(gx, gy);
        grainSrc[dst] = spectralData.getGrain(gx, gy);
        bodyMassSrc[dst] = this.bodyMass[src];
        sourceTimeSrc[dst] = this.sourceTime[src];
        sourceBandSrc[dst] = this.sourceBand[src];
        sourceWeightSrc[dst] = this.sourceWeight[src];
        bodyBiasSrc[dst] = this.bodyBias[src];
        airBiasSrc[dst] = this.airBias[src];
        impactBiasSrc[dst] = this.impactBias[src];
        traceBiasSrc[dst] = this.traceBias[src];
      }
    }

    const safeAmount = clamp01(amount);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = x0 + x;
        const gy = y0 + y;
        const dx = gx - cx;
        const dy = gy - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const t = 1 - dist / Math.max(1, radius);
        const falloff = t * t;
        let srcX = x;
        let srcY = y;
        if (mode === 'push') {
          srcX = x - dragDX * safeAmount * falloff;
          srcY = y - dragDY * safeAmount * falloff;
        } else if (mode === 'pinch' || mode === 'bloat') {
          const scale = mode === 'pinch' ? 1 + safeAmount * falloff * 0.9 : 1 - safeAmount * falloff * 0.6;
          const clamped = Math.max(0.15, scale);
          srcX = (gx - cx) * clamped + cx - x0;
          srcY = (gy - cy) * clamped + cy - y0;
        } else {
          const sign = mode === 'twirlCW' ? -1 : 1;
          const angle = sign * safeAmount * falloff * 1.5;
          const cosA = Math.cos(-angle);
          const sinA = Math.sin(-angle);
          const rx = dx * cosA - dy * sinA;
          const ry = dx * sinA + dy * cosA;
          srcX = rx + cx - x0;
          srcY = ry + cy - y0;
        }
        spectralData.set(gx, gy, this.sampleBilinear(ampSrc, w, h, srcX, srcY, 0));
        spectralData.setGrain(gx, gy, this.sampleBilinear(grainSrc, w, h, srcX, srcY, 0.5));
        const idx = this.getIndex(gx, gy);
        this.bodyMass[idx] = this.sampleBilinear(bodyMassSrc, w, h, srcX, srcY, 0);
        this.sourceTime[idx] = this.sampleBilinear(sourceTimeSrc, w, h, srcX, srcY, gx / Math.max(1, this.width - 1));
        this.sourceBand[idx] = this.sampleBilinear(sourceBandSrc, w, h, srcX, srcY, gy / Math.max(1, this.height - 1));
        this.sourceWeight[idx] = this.sampleBilinear(sourceWeightSrc, w, h, srcX, srcY, 0);
        this.bodyBias[idx] = this.sampleBilinear(bodyBiasSrc, w, h, srcX, srcY, 0.5);
        this.airBias[idx] = this.sampleBilinear(airBiasSrc, w, h, srcX, srcY, 0.5);
        this.impactBias[idx] = this.sampleBilinear(impactBiasSrc, w, h, srcX, srcY, 0.2);
        this.traceBias[idx] = this.sampleBilinear(traceBiasSrc, w, h, srcX, srcY, 0.2);
      }
    }
    this.scrubSilentRegionFromSpectralData(spectralData, cx, cy, radius + 2);
  }

  applySourceTraceMetadata(spectralData: SpectralData, sourceAsset: AudioSourceAsset, cx: number, cy: number, radius: number, amount: number, hardness: number, erase: boolean) {
    if (!this.initialized) return;
    const analysis = sourceAsset.analysisCache;
    if (!analysis) return;
    const sourceData = analysis.data;
    const sourceWidth = analysis.width;
    const sourceHeight = analysis.height;
    const transientEnvelope = analysis.transientEnvelope;
    const r = Math.max(1, Math.ceil(radius));
    const canvasToSourceX = (sourceWidth - 1) / Math.max(1, this.width - 1);
    const canvasToSourceY = (sourceHeight - 1) / Math.max(1, this.height - 1);
    const centerSourceX = (cx / Math.max(1, this.width - 1)) * (sourceWidth - 1);

    let centroidWeightedY = 0;
    let centroidWeight = 0;
    const centroidWindow = Math.max(1, Math.round(radius * canvasToSourceX * 1.8));
    for (let sx = Math.max(0, Math.floor(centerSourceX - centroidWindow)); sx <= Math.min(sourceWidth - 1, Math.ceil(centerSourceX + centroidWindow)); sx++) {
      const transient = transientEnvelope ? transientEnvelope[sx] ?? 0 : 0;
      const tWeight = 0.7 + transient * 0.9;
      for (let sy = 0; sy < sourceHeight; sy++) {
        const amp = sourceData[sy * sourceWidth + sx] ?? 0;
        if (amp <= 0.002) continue;
        const weight = amp * tWeight;
        centroidWeightedY += sy * weight;
        centroidWeight += weight;
      }
    }
    const centroidSourceY = centroidWeight > 1e-6 ? centroidWeightedY / centroidWeight : sourceHeight * 0.5;
    const centroidCanvasY = (centroidSourceY / Math.max(1, sourceHeight - 1)) * Math.max(1, this.height - 1);
    const shiftY = cy - centroidCanvasY;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const gx = cx + dx;
        const gy = cy + dy;
        if (gx < 0 || gx >= this.width || gy < 0 || gy >= this.height) continue;
        const idx = this.getIndex(gx, gy);
        const falloff = hardness >= 1 ? 1 : Math.exp(-(((dist / Math.max(1, radius)) ** 2) / (2 * (1 - hardness * 0.88) * 0.18)));
        const srcX = centerSourceX + dx * canvasToSourceX * (0.75 + hardness * 0.7);
        const srcY = (gy - shiftY) * canvasToSourceY;
        const transient = transientEnvelope ? transientEnvelope[Math.max(0, Math.min(sourceWidth - 1, Math.round(srcX)))] ?? 0 : 0;
        const sourceTopness = 1 - Math.max(0, Math.min(1, srcY / Math.max(1, sourceHeight - 1)));
        const mix = clamp01(amount * (0.25 + 0.75 * falloff));
        if (erase) {
          this.sourceWeight[idx] = Math.max(0, this.sourceWeight[idx] * (1 - mix * 0.8));
          this.traceBias[idx] = Math.min(1, this.traceBias[idx] + mix * 0.2);
        } else {
          this.sourceTime[idx] = this.sourceTime[idx] * (1 - mix) + clamp01(srcX / Math.max(1, sourceWidth - 1)) * mix;
          this.sourceBand[idx] = this.sourceBand[idx] * (1 - mix) + clamp01(srcY / Math.max(1, sourceHeight - 1)) * mix;
          this.sourceWeight[idx] = Math.min(1, this.sourceWeight[idx] + mix * (0.5 + transient * 0.4));
          this.traceBias[idx] = Math.min(1, this.traceBias[idx] + mix * 0.35);
          this.impactBias[idx] = this.impactBias[idx] * (1 - mix * 0.5) + transient * mix * 0.5;
          this.airBias[idx] = this.airBias[idx] * (1 - mix * 0.35) + sourceTopness * mix * 0.35;
          this.bodyBias[idx] = this.bodyBias[idx] * (1 - mix * 0.35) + (1 - sourceTopness) * mix * 0.35;
          this.bodyMass[idx] = Math.max(this.bodyMass[idx], spectralData.get(gx, gy));
        }
      }
    }
  }


  captureSnapshot(): Forge3BodyFieldSnapshot {
    const cloneMeta = (meta: Forge3StampMeta | null): Forge3StampMetaSnapshot | null => {
      if (!meta) return null;
      return {
        width: meta.width,
        height: meta.height,
        bodyMass: meta.bodyMass.slice(),
        sourceTime: meta.sourceTime.slice(),
        sourceBand: meta.sourceBand.slice(),
        sourceWeight: meta.sourceWeight.slice(),
        bodyBias: meta.bodyBias.slice(),
        airBias: meta.airBias.slice(),
        impactBias: meta.impactBias.slice(),
        traceBias: meta.traceBias.slice(),
      };
    };

    return {
      width: this.width,
      height: this.height,
      bodyMass: this.bodyMass.slice(),
      sourceTime: this.sourceTime.slice(),
      sourceBand: this.sourceBand.slice(),
      sourceWeight: this.sourceWeight.slice(),
      bodyBias: this.bodyBias.slice(),
      airBias: this.airBias.slice(),
      impactBias: this.impactBias.slice(),
      traceBias: this.traceBias.slice(),
      initialized: this.initialized,
      sourceSignature: this.sourceSignature,
      stampMeta: cloneMeta(this.stampMeta),
    };
  }

  restoreSnapshot(snapshot: Forge3BodyFieldSnapshot) {
    this.width = snapshot.width;
    this.height = snapshot.height;
    this.bodyMass = snapshot.bodyMass.slice();
    this.sourceTime = snapshot.sourceTime.slice();
    this.sourceBand = snapshot.sourceBand.slice();
    this.sourceWeight = snapshot.sourceWeight.slice();
    this.bodyBias = snapshot.bodyBias.slice();
    this.airBias = snapshot.airBias.slice();
    this.impactBias = snapshot.impactBias.slice();
    this.traceBias = snapshot.traceBias.slice();
    this.initialized = snapshot.initialized;
    this.sourceSignature = snapshot.sourceSignature;
    this.stampMeta = snapshot.stampMeta ? {
      width: snapshot.stampMeta.width,
      height: snapshot.stampMeta.height,
      bodyMass: snapshot.stampMeta.bodyMass.slice(),
      sourceTime: snapshot.stampMeta.sourceTime.slice(),
      sourceBand: snapshot.stampMeta.sourceBand.slice(),
      sourceWeight: snapshot.stampMeta.sourceWeight.slice(),
      bodyBias: snapshot.stampMeta.bodyBias.slice(),
      airBias: snapshot.stampMeta.airBias.slice(),
      impactBias: snapshot.stampMeta.impactBias.slice(),
      traceBias: snapshot.stampMeta.traceBias.slice(),
    } : null;
  }

  describeCell(x: number, y: number): Forge3CellDescription | null {
    if (!this.initialized || x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    const idx = this.getIndex(x, y);
    const body = this.bodyBias[idx];
    const air = this.airBias[idx];
    const impact = this.impactBias[idx];
    const trace = this.traceBias[idx];
    let classLabel: Forge3CellDescription['classLabel'] = 'body';
    let best = body;
    if (air > best) { best = air; classLabel = 'air'; }
    if (impact > best) { best = impact; classLabel = 'impact'; }
    if (trace > best) { classLabel = 'trace'; }
    return {
      sourceWeight: this.sourceWeight[idx],
      sourceTime: this.sourceTime[idx],
      sourceBand: this.sourceBand[idx],
      classLabel,
    };
  }

  getSummary(spectralData: SpectralData): Forge3FieldSummary {
    if (!this.initialized || this.width !== spectralData.width || this.height !== spectralData.height) {
      return { activeCells: 0, avgSourceWeight: 0, avgTrace: 0, latentCells: 0 };
    }
    let activeCells = 0;
    let latentCells = 0;
    let sourceWeightSum = 0;
    let traceSum = 0;
    for (let i = 0; i < this.bodyMass.length; i++) {
      const amp = this.bodyMass[i];
      if (amp > 0.01) {
        activeCells++;
        sourceWeightSum += this.sourceWeight[i];
        traceSum += this.traceBias[i];
      } else if (this.sourceWeight[i] > 0.2) {
        latentCells++;
      }
    }
    return {
      activeCells,
      avgSourceWeight: activeCells ? sourceWeightSum / activeCells : 0,
      avgTrace: activeCells ? traceSum / activeCells : 0,
      latentCells,
    };
  }
}

const singleton = new Forge3BodyField();

export function getForge3BodyField(): Forge3PreviewField & Forge3BodyField {
  return singleton;
}
