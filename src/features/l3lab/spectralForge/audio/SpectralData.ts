/**
 * SpectralData – 2D spectral data grid with grain-size layer
 * X-axis = time columns, Y-axis = frequency bins
 * Primary layer: amplitude 0.0–1.0
 * Grain layer: grain duration 0.0–1.0 (maps to 2ms–200ms)
 */

export interface StampData {
  data: Float32Array;
  grainData: Float32Array;
  width: number;
  height: number;
}

export interface StampTransform {
  scaleX: number;
  scaleY: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

export interface PreparedStampTransform {
  safeScaleX: number;
  safeScaleY: number;
  flipMulX: number;
  flipMulY: number;
  cosR: number;
  sinR: number;
  srcCenterX: number;
  srcCenterY: number;
}

export type MorphMode = 'push' | 'bloat' | 'pinch' | 'twirlCW' | 'twirlCCW';

export class SpectralData {
  readonly width: number;   // time columns
  readonly height: number;  // frequency bins
  data: Float32Array;       // amplitude layer
  grainData: Float32Array;  // grain-size layer (0=short/noisy, 1=long/tonal)

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Float32Array(width * height);
    this.grainData = new Float32Array(width * height);
    // Default grain size to 0.5
    this.grainData.fill(0.5);
  }

  private sampleBilinear(buf: Float32Array, w: number, h: number, x: number, y: number, fallback = 0): number {
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

    return v00 * (1 - tx) * (1 - ty)
      + v10 * tx * (1 - ty)
      + v01 * (1 - tx) * ty
      + v11 * tx * ty;
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.data[y * this.width + x];
  }

  set(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.data[y * this.width + x] = Math.max(0, Math.min(1, value));
  }

  getGrain(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0.5;
    return this.grainData[y * this.width + x];
  }

  setGrain(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.grainData[y * this.width + x] = Math.max(0, Math.min(1, value));
  }

  add(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = y * this.width + x;
    this.data[idx] = Math.max(0, Math.min(1, this.data[idx] + value));
  }

  subtract(x: number, y: number, value: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = y * this.width + x;
    this.data[idx] = Math.max(0, this.data[idx] - value);
  }

  /** Apply value: add or subtract based on erase flag, also blend grain size */
  private apply(x: number, y: number, value: number, erase: boolean, grainSize?: number): void {
    if (erase) {
      this.subtract(x, y, value);
    } else {
      // Blend grain size when adding amplitude
      if (grainSize !== undefined && value > 0.001) {
        const idx = y * this.width + x;
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          const existingAmp = this.data[idx];
          const existingGrain = this.grainData[idx];
          // Weighted blend: new grain = (existing * existingAmp + new * newValue) / (existingAmp + newValue)
          const totalAmp = existingAmp + value;
          if (totalAmp > 0.001) {
            this.grainData[idx] = (existingGrain * existingAmp + grainSize * value) / totalAmp;
          }
        }
      }
      this.add(x, y, value);
    }
  }

  /** Get a full column (time slice) as frequency amplitudes */
  getColumn(x: number): Float32Array {
    const col = new Float32Array(this.height);
    if (x < 0 || x >= this.width) return col;
    for (let y = 0; y < this.height; y++) {
      col[y] = this.data[y * this.width + x];
    }
    return col;
  }

  /** Clear entire grid */
  clear(): void {
    this.data.fill(0);
    this.grainData.fill(0.5);
  }

  /** Clone data for undo snapshots (includes grain data) */
  cloneData(): Float32Array {
    // Pack both arrays: [ampData, grainData]
    const combined = new Float32Array(this.data.length * 2);
    combined.set(this.data, 0);
    combined.set(this.grainData, this.data.length);
    return combined;
  }

  /** Restore from snapshot */
  restoreData(snapshot: Float32Array): void {
    if (snapshot.length === this.data.length * 2) {
      // New format with grain data
      this.data.set(snapshot.subarray(0, this.data.length));
      this.grainData.set(snapshot.subarray(this.data.length));
    } else {
      // Legacy format without grain data
      this.data.set(snapshot);
      this.grainData.fill(0.5);
    }
  }

  /** Apply Gaussian brush at position */
  applyBrush(
    cx: number,
    cy: number,
    radius: number,
    intensity: number,
    hardness: number = 0.5,
    erase: boolean = false,
    grainSize: number = 0.5
  ): void {
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const normalizedDist = dist / radius;
        const falloff = hardness >= 1
          ? 1
          : Math.exp(-((normalizedDist * normalizedDist) / (2 * (1 - hardness * 0.9) * 0.15)));

        const val = intensity * falloff;
        this.apply(cx + dx, cy + dy, val, erase, grainSize);
      }
    }
  }

  /** Apply spray/scatter brush */
  applySpray(
    cx: number,
    cy: number,
    radius: number,
    intensity: number,
    density: number = 0.3,
    erase: boolean = false,
    grainSize: number = 0.5
  ): void {
    const numDots = Math.ceil(radius * radius * density);
    for (let i = 0; i < numDots; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const dx = Math.round(Math.cos(angle) * dist);
      const dy = Math.round(Math.sin(angle) * dist);
      this.apply(cx + dx, cy + dy, intensity * (0.5 + Math.random() * 0.5), erase, grainSize);
    }
  }

  /** Draw line from (x0,y0) to (x1,y1) using Bresenham */
  drawLine(
    x0: number, y0: number,
    x1: number, y1: number,
    radius: number,
    intensity: number,
    hardness: number,
    brushType: 'brush' | 'spray' = 'brush',
    erase: boolean = false,
    sprayDensity: number = 0.3,
    grainSize: number = 0.5
  ): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0, y = y0;

    const steps = Math.max(dx, dy, 1);
    const stepSize = Math.max(1, Math.floor(radius * 0.3));

    let count = 0;
    while (true) {
      if (count % stepSize === 0) {
        if (brushType === 'spray') {
          this.applySpray(x, y, radius, intensity, sprayDensity, erase, grainSize);
        } else {
          this.applyBrush(x, y, radius, intensity, hardness, erase, grainSize);
        }
      }
      count++;

      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
      if (count > steps + 1) break;
    }
  }

  /** Apply harmonic brush - paints fundamental + overtones */
  applyHarmonicBrush(
    cx: number,
    cy: number,
    radius: number,
    intensity: number,
    hardness: number,
    numHarmonics: number,
    harmonicDecay: number,
    totalHeight: number,
    erase: boolean = false,
    grainSize: number = 0.5
  ): void {
    // Paint fundamental
    this.applyBrush(cx, cy, radius, intensity, hardness, erase, grainSize);

    const fundamentalFreq = yToFrequency(cy, totalHeight);

    for (let h = 2; h <= numHarmonics + 1; h++) {
      const harmonicFreq = fundamentalFreq * h;
      if (harmonicFreq > 20000) break;
      const harmonicY = frequencyToY(harmonicFreq, totalHeight);
      const harmonicIntensity = intensity * Math.pow(harmonicDecay, h - 1);
      // Higher harmonics get slightly shorter grain (brighter timbre)
      const harmonicGrain = Math.max(0, grainSize - (h - 1) * 0.05);
      this.applyBrush(cx, Math.round(harmonicY), Math.max(1, radius * 0.7), harmonicIntensity, hardness, erase, harmonicGrain);
    }
  }

  /** Apply noise brush - fills region with random amplitudes */
  applyNoiseBrush(
    cx: number,
    cy: number,
    radius: number,
    intensity: number,
    erase: boolean = false,
    grainSize: number = 0.5
  ): void {
    const r = Math.ceil(radius);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const falloff = 1 - (dist / radius);
        // Noise brush gets randomized grain sizes for texture
        const randomGrain = Math.max(0, Math.min(1, grainSize + (Math.random() - 0.5) * 0.4));
        this.apply(cx + dx, cy + dy, intensity * falloff * Math.random(), erase, randomGrain);
      }
    }
  }

  /** Apply formant stamp - creates vowel-like formant patterns
   *  cy parameter shifts the formant center frequency relative to cursor position
   */
  applyFormantStamp(
    cx: number,
    cy: number,
    formantType: 'a' | 'e' | 'i' | 'o' | 'u',
    intensity: number,
    totalHeight: number,
    width: number = 8,
    erase: boolean = false,
    grainSize: number = 0.5
  ): void {
    // Base formant frequencies for a ~125Hz fundamental (male voice)
    const baseFormants: Record<string, number[]> = {
      'a': [800, 1150, 2900, 3900, 4950],
      'e': [400, 1600, 2700, 3300, 4950],
      'i': [350, 2000, 2800, 3600, 4950],
      'o': [450, 800, 2830, 3800, 4950],
      'u': [325, 700, 2530, 3500, 4950],
    };
    const bandwidths = [80, 90, 120, 130, 140];
    const amplitudes = [1, 0.5, 0.3, 0.2, 0.15];

    // Get the frequency at cursor Y position
    const cursorFreq = yToFrequency(cy, totalHeight);
    // Reference: geometric center of formant pattern (~1500Hz for most vowels)
    const referenceCenter = 1500;
    // Compute pitch shift ratio
    const shiftRatio = cursorFreq / referenceCenter;

    const freqs = baseFormants[formantType];
    for (let f = 0; f < freqs.length; f++) {
      // Shift formant frequency based on cursor position
      const shiftedFreq = freqs[f] * shiftRatio;
      if (shiftedFreq > 20000 || shiftedFreq < 20) continue;

      const centerY = frequencyToY(shiftedFreq, totalHeight);
      // Scale bandwidth with the shift
      const bw = bandwidths[f] * Math.max(0.5, shiftRatio);
      const bwPixels = Math.max(2, Math.round(bw / 20));

      for (let ddx = -width; ddx <= width; ddx++) {
        for (let ddy = -bwPixels * 2; ddy <= bwPixels * 2; ddy++) {
          const falloff = Math.exp(-(ddy * ddy) / (2 * bwPixels * bwPixels));
          const timeFalloff = Math.exp(-(ddx * ddx) / (2 * width * width));
          this.apply(
            cx + ddx,
            Math.round(centerY) + ddy,
            intensity * amplitudes[f] * falloff * timeFalloff,
            erase,
            grainSize
          );
        }
      }
    }
  }

  /** Copy a rectangular region for stamp tool */
  copyRegion(x: number, y: number, w: number, h: number): StampData {
    const data = new Float32Array(w * h);
    const grainDataCopy = new Float32Array(w * h);

    for (let dy = 0; dy < h; dy++) {
      const gy = y + dy;
      if (gy < 0 || gy >= this.height) continue;

      const srcX0 = Math.max(0, x);
      const srcX1 = Math.min(this.width, x + w);
      const copyLen = Math.max(0, srcX1 - srcX0);
      if (copyLen <= 0) continue;

      const dstOffset = dy * w + (srcX0 - x);
      const srcOffset = gy * this.width + srcX0;
      data.set(this.data.subarray(srcOffset, srcOffset + copyLen), dstOffset);
      grainDataCopy.set(this.grainData.subarray(srcOffset, srcOffset + copyLen), dstOffset);
    }

    return { data, grainData: grainDataCopy, width: w, height: h };
  }

  /** Cut a rectangular region and return it as stamp data */
  cutRegion(x: number, y: number, w: number, h: number): StampData {
    const stamp = this.copyRegion(x, y, w, h);

    for (let dy = 0; dy < h; dy++) {
      const gy = y + dy;
      if (gy < 0 || gy >= this.height) continue;

      const srcX0 = Math.max(0, x);
      const srcX1 = Math.min(this.width, x + w);
      const clearLen = Math.max(0, srcX1 - srcX0);
      if (clearLen <= 0) continue;

      const rowOffset = gy * this.width + srcX0;
      this.data.fill(0, rowOffset, rowOffset + clearLen);
      this.grainData.fill(0.5, rowOffset, rowOffset + clearLen);
    }

    return stamp;
  }

  prepareStampTransform(stamp: StampData, transform: StampTransform): PreparedStampTransform {
    return {
      safeScaleX: Math.max(0.05, Math.abs(transform.scaleX)),
      safeScaleY: Math.max(0.05, Math.abs(transform.scaleY)),
      flipMulX: transform.flipX ? -1 : 1,
      flipMulY: transform.flipY ? -1 : 1,
      cosR: Math.cos(-transform.rotation),
      sinR: Math.sin(-transform.rotation),
      srcCenterX: stamp.width / 2,
      srcCenterY: stamp.height / 2,
    };
  }

  getStampBounds(stamp: StampData, transform: Partial<StampTransform> = {}) {
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
    const halfW = Math.max(1, Math.ceil(Math.abs(a * cosA) + Math.abs(b * sinA)));
    const halfH = Math.max(1, Math.ceil(Math.abs(a * sinA) + Math.abs(b * cosA)));
    return {
      halfW,
      halfH,
      outW: halfW * 2,
      outH: halfH * 2,
    };
  }

  sampleStampTransformed(
    stamp: StampData,
    outX: number,
    outY: number,
    transform: StampTransform,
    prepared?: PreparedStampTransform
  ): { amp: number; grain: number } {
    const prep = prepared ?? this.prepareStampTransform(stamp, transform);

    const localX = outX / prep.safeScaleX;
    const localY = outY / prep.safeScaleY;

    const sx = prep.flipMulX * localX;
    const sy = prep.flipMulY * localY;

    const rx = sx * prep.cosR - sy * prep.sinR;
    const ry = sx * prep.sinR + sy * prep.cosR;

    const srcX = rx + prep.srcCenterX;
    const srcY = ry + prep.srcCenterY;

    const amp = this.sampleBilinear(stamp.data, stamp.width, stamp.height, srcX, srcY, 0);
    const grain = this.sampleBilinear(stamp.grainData, stamp.width, stamp.height, srcX, srcY, 0.5);
    return { amp, grain };
  }

  /** Paste a stamp at position with optional scaling and intensity */
  pasteStamp(
    cx: number,
    cy: number,
    stamp: StampData,
    intensity: number = 1.0,
    erase: boolean = false,
    transform: Partial<StampTransform> = {}
  ): void {
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
    const prepared = this.prepareStampTransform(stamp, finalTransform);

    for (let dy = 0; dy < outH; dy++) {
      for (let dx = 0; dx < outW; dx++) {
        const outX = dx - halfW;
        const outY = dy - halfH;
        const sample = this.sampleStampTransformed(stamp, outX, outY, finalTransform, prepared);
        const val = sample.amp;
        const grainVal = sample.grain;

        if (val > 0.001) {
          this.apply(cx - halfW + dx, cy - halfH + dy, val * intensity, erase, grainVal);
        }
      }
    }
  }


  applySmudge(
    cx: number,
    cy: number,
    radius: number,
    amount: number,
    dragDX: number,
    dragDY: number,
    grainSize: number = 0.5
  ): void {
    const r = Math.max(2, Math.ceil(radius));
    const x0 = Math.max(0, cx - r - 2);
    const y0 = Math.max(0, cy - r - 2);
    const x1 = Math.min(this.width - 1, cx + r + 2);
    const y1 = Math.min(this.height - 1, cy + r + 2);
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;

    const ampSrc = new Float32Array(w * h);
    const grainSrc = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = x0 + x;
        const gy = y0 + y;
        ampSrc[y * w + x] = this.get(gx, gy);
        grainSrc[y * w + x] = this.getGrain(gx, gy);
      }
    }

    const safeAmount = Math.max(0, Math.min(1, amount));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = x0 + x;
        const gy = y0 + y;
        const dx = gx - cx;
        const dy = gy - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const falloff = Math.pow(1 - dist / Math.max(1, radius), 2);
        const srcX = x - dragDX * (0.45 + safeAmount * 1.65) * falloff;
        const srcY = y - dragDY * (0.45 + safeAmount * 1.65) * falloff;
        const sampledAmp = this.sampleBilinear(ampSrc, w, h, srcX, srcY, 0);
        const sampledGrain = this.sampleBilinear(grainSrc, w, h, srcX, srcY, 0.5);
        const currentAmp = ampSrc[y * w + x];
        const currentGrain = grainSrc[y * w + x];
        const mix = safeAmount * (0.35 + 0.65 * falloff);
        this.set(gx, gy, currentAmp * (1 - mix) + sampledAmp * mix);
        this.setGrain(gx, gy, currentGrain * (1 - mix * 0.8) + ((sampledGrain + grainSize) * 0.5) * mix * 0.8);
      }
    }
  }

  applyDodgeBurn(
    cx: number,
    cy: number,
    radius: number,
    amount: number,
    hardness: number,
    burn: boolean,
    grainSize: number = 0.5
  ): void {
    const r = Math.max(1, Math.ceil(radius));
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const normalizedDist = dist / Math.max(1, radius);
        const falloff = hardness >= 1
          ? 1
          : Math.exp(-((normalizedDist * normalizedDist) / (2 * (1 - hardness * 0.9) * 0.16)));
        const gx = cx + dx;
        const gy = cy + dy;
        const current = this.get(gx, gy);
        const currentGrain = this.getGrain(gx, gy);
        const delta = amount * falloff * 0.75;
        const next = burn ? current * (1 - delta) : current + (1 - current) * delta;
        this.set(gx, gy, next);
        this.setGrain(gx, gy, currentGrain * 0.8 + grainSize * 0.2);
      }
    }
  }

  applyBlurSharpen(
    cx: number,
    cy: number,
    radius: number,
    amount: number,
    detailProtect: number,
    sharpen: boolean
  ): void {
    const r = Math.max(1, Math.ceil(radius));
    const x0 = Math.max(0, cx - r - 2);
    const y0 = Math.max(0, cy - r - 2);
    const x1 = Math.min(this.width - 1, cx + r + 2);
    const y1 = Math.min(this.height - 1, cy + r + 2);
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;
    const ampSrc = new Float32Array(w * h);
    const grainSrc = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = x0 + x;
        const gy = y0 + y;
        ampSrc[y * w + x] = this.get(gx, gy);
        grainSrc[y * w + x] = this.getGrain(gx, gy);
      }
    }

    const kernelRadius = Math.max(1, Math.round(1 + radius * 0.15));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = x0 + x;
        const gy = y0 + y;
        const dx = gx - cx;
        const dy = gy - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        let sumAmp = 0;
        let sumGrain = 0;
        let count = 0;
        for (let oy = -kernelRadius; oy <= kernelRadius; oy++) {
          for (let ox = -kernelRadius; ox <= kernelRadius; ox++) {
            const sx = x + ox;
            const sy = y + oy;
            if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
            sumAmp += ampSrc[sy * w + sx];
            sumGrain += grainSrc[sy * w + sx];
            count++;
          }
        }
        const baseAmp = ampSrc[y * w + x];
        const blurAmp = count > 0 ? sumAmp / count : baseAmp;
        const blurGrain = count > 0 ? sumGrain / count : grainSrc[y * w + x];
        const falloff = Math.pow(1 - dist / Math.max(1, radius), 2);
        const blend = amount * (0.25 + 0.75 * falloff);
        if (sharpen) {
          const detail = baseAmp - blurAmp;
          const protect = 0.4 + detailProtect * 0.9;
          this.set(gx, gy, Math.max(0, Math.min(1, baseAmp + detail * blend * protect * 1.8)));
        } else {
          this.set(gx, gy, baseAmp * (1 - blend) + blurAmp * blend);
          this.setGrain(gx, gy, grainSrc[y * w + x] * (1 - blend * 0.7) + blurGrain * blend * 0.7);
        }
      }
    }
  }

  applyDelaySmear(
    cx: number,
    cy: number,
    radius: number,
    amount: number,
    hardness: number,
    erase: boolean = false,
    grainSize: number = 0.5
  ): void {
    const r = Math.max(1, Math.ceil(radius));
    const repeats = Math.max(2, Math.min(6, Math.round(2 + hardness * 4)));
    const spacing = Math.max(1, Math.round(radius * (0.5 + (1 - hardness) * 0.7)));
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const gx = cx + dx;
        const gy = cy + dy;
        const amp = this.get(gx, gy);
        if (amp < 0.015) continue;
        const falloff = Math.pow(1 - dist / Math.max(1, radius), 2);
        for (let rep = 1; rep <= repeats; rep++) {
          const targetX = gx + rep * spacing;
          const echo = amp * amount * falloff * Math.pow(0.68 - hardness * 0.12, rep - 1);
          if (echo < 0.002) continue;
          if (erase) {
            this.subtract(targetX, gy, echo * 0.75);
          } else {
            this.apply(targetX, gy, echo, false, grainSize);
          }
        }
      }
    }
  }

  applyThresholdBrush(
    cx: number,
    cy: number,
    radius: number,
    thresholdAmount: number,
    hardness: number,
    restore: boolean = false,
    grainSize: number = 0.5
  ): void {
    const r = Math.max(1, Math.ceil(radius));
    const threshold = Math.max(0.02, Math.min(0.95, thresholdAmount));
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const falloff = Math.pow(1 - dist / Math.max(1, radius), 2);
        const gx = cx + dx;
        const gy = cy + dy;
        const amp = this.get(gx, gy);
        if (restore) {
          if (amp > 0 && amp < threshold) {
            const lifted = amp + (threshold - amp) * hardness * falloff * 0.8;
            this.set(gx, gy, lifted);
            this.setGrain(gx, gy, this.getGrain(gx, gy) * 0.8 + grainSize * 0.2);
          }
        } else {
          if (amp < threshold) {
            const reduced = amp * Math.max(0, 1 - (0.9 + hardness * 0.9) * falloff);
            this.set(gx, gy, reduced);
          } else {
            this.set(gx, gy, Math.min(1, amp + (amp - threshold) * 0.08 * hardness * falloff));
          }
        }
      }
    }
  }

  applySourceTrace(
    cx: number,
    cy: number,
    radius: number,
    amount: number,
    hardness: number,
    sourceData: Float32Array,
    sourceWidth: number,
    sourceHeight: number,
    transientEnvelope?: Float32Array,
    erase: boolean = false,
    grainSize: number = 0.5
  ): void {
    if (!sourceData.length || sourceWidth <= 0 || sourceHeight <= 0) return;
    const r = Math.max(1, Math.ceil(radius));
    const canvasToSourceX = (sourceWidth - 1) / Math.max(1, this.width - 1);
    const canvasToSourceY = (sourceHeight - 1) / Math.max(1, this.height - 1);
    const centerSourceX = (cx / Math.max(1, this.width - 1)) * (sourceWidth - 1);

    let centroidWeightedY = 0;
    let centroidWeight = 0;
    const centroidWindow = Math.max(1, Math.round(radius * canvasToSourceX * 1.8));
    for (let sx = Math.max(0, Math.floor(centerSourceX - centroidWindow)); sx <= Math.min(sourceWidth - 1, Math.ceil(centerSourceX + centroidWindow)); sx++) {
      const transient = transientEnvelope ? (transientEnvelope[sx] ?? 0) : 0;
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
        const falloff = hardness >= 1
          ? 1
          : Math.exp(-(((dist / Math.max(1, radius)) ** 2) / (2 * (1 - hardness * 0.88) * 0.18)));
        const srcX = centerSourceX + dx * canvasToSourceX * (0.75 + hardness * 0.7);
        const srcY = (gy - shiftY) * canvasToSourceY;
        const sampled = this.sampleBilinear(sourceData, sourceWidth, sourceHeight, srcX, srcY, 0);
        if (sampled <= 0.001) continue;
        const transient = transientEnvelope
          ? transientEnvelope[Math.max(0, Math.min(sourceWidth - 1, Math.round(srcX)))] ?? 0
          : 0;
        const shaped = sampled * amount * (0.28 + 0.72 * falloff) * (0.82 + transient * 0.65);
        const sourceTopness = 1 - Math.max(0, Math.min(1, srcY / Math.max(1, sourceHeight - 1)));
        const tracedGrain = Math.max(0, Math.min(1, grainSize * 0.45 + sourceTopness * 0.35 + transient * 0.18));
        if (erase) {
          this.subtract(gx, gy, shaped * 0.9);
        } else {
          this.apply(gx, gy, shaped, false, tracedGrain);
        }
      }
    }
  }

  applyMorph(
    cx: number,
    cy: number,
    radius: number,
    amount: number,
    mode: MorphMode,
    dragDX: number,
    dragDY: number
  ): void {
    const r = Math.max(2, Math.ceil(radius));
    const x0 = Math.max(0, cx - r - 2);
    const y0 = Math.max(0, cy - r - 2);
    const x1 = Math.min(this.width - 1, cx + r + 2);
    const y1 = Math.min(this.height - 1, cy + r + 2);
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;

    const ampSrc = new Float32Array(w * h);
    const grainSrc = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const gx = x0 + x;
        const gy = y0 + y;
        ampSrc[y * w + x] = this.get(gx, gy);
        grainSrc[y * w + x] = this.getGrain(gx, gy);
      }
    }

    const safeAmount = Math.max(0, Math.min(1, amount));

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
          const scale = mode === 'pinch'
            ? 1 + safeAmount * falloff * 0.9
            : 1 - safeAmount * falloff * 0.6;
          const clamped = Math.max(0.15, scale);
          srcX = (gx - cx) * clamped + cx - x0;
          srcY = (gy - cy) * clamped + cy - y0;
        } else if (mode === 'twirlCW' || mode === 'twirlCCW') {
          const sign = mode === 'twirlCW' ? -1 : 1;
          const angle = sign * safeAmount * falloff * 1.5;
          const cosA = Math.cos(-angle);
          const sinA = Math.sin(-angle);
          const rx = dx * cosA - dy * sinA;
          const ry = dx * sinA + dy * cosA;
          srcX = rx + cx - x0;
          srcY = ry + cy - y0;
        }

        const amp = this.sampleBilinear(ampSrc, w, h, srcX, srcY, 0);
        const grain = this.sampleBilinear(grainSrc, w, h, srcX, srcY, 0.5);
        this.set(gx, gy, amp);
        this.setGrain(gx, gy, grain);
      }
    }
  }
}

// Frequency mapping utilities (log scale, 20Hz - 20kHz)
const MIN_FREQ = 20;
const MAX_FREQ = 20000;

export function yToFrequency(y: number, totalHeight: number): number {
  const normalized = 1 - y / totalHeight;
  return MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, normalized);
}

export function frequencyToY(freq: number, totalHeight: number): number {
  const normalized = Math.log(freq / MIN_FREQ) / Math.log(MAX_FREQ / MIN_FREQ);
  return (1 - normalized) * totalHeight;
}

export function frequencyToNoteName(freq: number): string {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midiNote = 12 * Math.log2(freq / 440) + 69;
  const roundedNote = Math.round(midiNote);
  const octave = Math.floor(roundedNote / 12) - 1;
  const noteIndex = ((roundedNote % 12) + 12) % 12;
  return `${noteNames[noteIndex]}${octave}`;
}
