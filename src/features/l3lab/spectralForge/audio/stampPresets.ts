import { frequencyToY, type StampData } from './SpectralData';

export type StampCategory = 'melodic' | 'harmonic' | 'vocal' | 'attack' | 'texture' | 'transform' | 'legacy';
export type StampDecayType = 'none' | 'short' | 'medium' | 'long' | 'bloom';

export interface StampPreset {
  id: string;
  name: string;
  description: string;
  category: StampCategory;
  stamp: StampData;
  legacy?: boolean;
  tags: string[];
  previewColor: string;
  spectralRole: string;
  pitched: boolean;
  percussive: boolean;
  decayType: StampDecayType;
  recommendedRenderModes: Array<'additive' | 'ifft' | 'granular'>;
  defaultSize: number;
  defaultIntensity: number;
  notes?: string;
}

function createEmptyStamp(width: number, height: number, baseGrain = 0.5): StampData {
  return {
    data: new Float32Array(width * height),
    grainData: new Float32Array(width * height).fill(baseGrain),
    width,
    height,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function addPoint(stamp: StampData, x: number, y: number, value: number, grain: number): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || ix >= stamp.width || iy < 0 || iy >= stamp.height) return;
  const idx = iy * stamp.width + ix;
  stamp.data[idx] = clamp(stamp.data[idx] + value, 0, 1);
  stamp.grainData[idx] = clamp(stamp.grainData[idx] * 0.75 + grain * 0.25, 0, 1);
}

function paintBlob(stamp: StampData, cx: number, cy: number, rx: number, ry: number, amp: number, grain: number): void {
  const maxX = Math.ceil(rx);
  const maxY = Math.ceil(ry);
  for (let dy = -maxY; dy <= maxY; dy++) {
    for (let dx = -maxX; dx <= maxX; dx++) {
      const nx = dx / Math.max(1, rx);
      const ny = dy / Math.max(1, ry);
      const dist = nx * nx + ny * ny;
      if (dist > 1) continue;
      const falloff = Math.exp(-dist * 2.4);
      addPoint(stamp, cx + dx, cy + dy, amp * falloff, grain);
    }
  }
}

function addSoftLine(
  stamp: StampData,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thicknessX: number,
  thicknessY: number,
  amp: number,
  grain: number
): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    const env = Math.sin(t * Math.PI) * 0.25 + 0.75;
    paintBlob(stamp, x, y, thicknessX, thicknessY, amp * env, grain);
  }
}

function addHarmonicLine(
  stamp: StampData,
  xStart: number,
  xEnd: number,
  baseFreqStart: number,
  baseFreqEnd: number,
  harmonics: number,
  amp = 0.9,
  grain = 0.7,
  width = 1.3
): void {
  for (let h = 1; h <= harmonics; h++) {
    const hs = baseFreqStart * h;
    const he = baseFreqEnd * h;
    if (hs > 19500 && he > 19500) break;
    const y0 = frequencyToY(clamp(hs, 20, 19500), stamp.height);
    const y1 = frequencyToY(clamp(he, 20, 19500), stamp.height);
    const hAmp = amp * Math.pow(0.58, h - 1);
    const ry = 1.1 + h * 0.3;
    addSoftLine(stamp, xStart, y0, xEnd, y1, width, ry, hAmp, Math.max(0.08, grain - (h - 1) * 0.05));
  }
}

function addOddHarmonicLine(
  stamp: StampData,
  xStart: number,
  xEnd: number,
  baseFreqStart: number,
  baseFreqEnd: number,
  oddPartials: number,
  amp = 0.9,
  grain = 0.65,
  width = 1.1
): void {
  for (let i = 0; i < oddPartials; i++) {
    const h = i * 2 + 1;
    const hs = baseFreqStart * h;
    const he = baseFreqEnd * h;
    if (hs > 19500 && he > 19500) break;
    const y0 = frequencyToY(clamp(hs, 20, 19500), stamp.height);
    const y1 = frequencyToY(clamp(he, 20, 19500), stamp.height);
    const hAmp = amp * Math.pow(0.67, i);
    const ry = 1 + i * 0.45;
    addSoftLine(stamp, xStart, y0, xEnd, y1, width, ry, hAmp, Math.max(0.08, grain - i * 0.05));
  }
}

function addFormantBand(
  stamp: StampData,
  xStart: number,
  xEnd: number,
  centerFreqStart: number,
  centerFreqEnd: number,
  thickness: number,
  amp: number,
  grain: number
): void {
  const y0 = frequencyToY(clamp(centerFreqStart, 20, 19500), stamp.height);
  const y1 = frequencyToY(clamp(centerFreqEnd, 20, 19500), stamp.height);
  addSoftLine(stamp, xStart, y0, xEnd, y1, 2.4, thickness, amp, grain);
}

function addCloud(
  stamp: StampData,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  points: number,
  amp: number,
  grainMin: number,
  grainMax: number,
  seed: number
): void {
  const next = rng(seed);
  for (let i = 0; i < points; i++) {
    const angle = next() * Math.PI * 2;
    const r = Math.sqrt(next());
    const x = cx + Math.cos(angle) * rx * r;
    const y = cy + Math.sin(angle) * ry * r;
    const localAmp = amp * (0.4 + next() * 0.6);
    const localGrain = grainMin + next() * (grainMax - grainMin);
    paintBlob(stamp, x, y, 0.7 + next() * 1.4, 0.9 + next() * 3.2, localAmp, localGrain);
  }
}

function addDiamond(
  stamp: StampData,
  cx: number,
  cy: number,
  halfWidth: number,
  halfHeight: number,
  amp: number,
  grain: number
): void {
  for (let x = Math.floor(cx - halfWidth); x <= Math.ceil(cx + halfWidth); x++) {
    const dx = Math.abs(x - cx);
    const ratio = 1 - dx / Math.max(1, halfWidth);
    if (ratio <= 0) continue;
    const localHalfHeight = halfHeight * ratio;
    for (let y = Math.floor(cy - localHalfHeight); y <= Math.ceil(cy + localHalfHeight); y++) {
      const dy = Math.abs(y - cy);
      const innerRatio = 1 - dy / Math.max(1, localHalfHeight);
      const strength = amp * Math.pow(Math.max(0, ratio * innerRatio), 0.8);
      addPoint(stamp, x, y, strength * 0.11, grain);
    }
  }
}

function addPulseColumns(
  stamp: StampData,
  startX: number,
  endX: number,
  every: number,
  baseFreq: number,
  spreadHz: number,
  amp: number,
  grain: number
): void {
  for (let x = startX; x <= endX; x += every) {
    const t = (x - startX) / Math.max(1, endX - startX);
    const freq = baseFreq + Math.sin(t * Math.PI * 4) * spreadHz;
    const y = frequencyToY(clamp(freq, 30, 18000), stamp.height);
    paintBlob(stamp, x, y, 1.4, 7.5, amp, grain);
  }
}

function addRibbon(
  stamp: StampData,
  xStart: number,
  xEnd: number,
  fStart: number,
  fEnd: number,
  wobbleHz: number,
  wobbleRate: number,
  amp: number,
  grain: number,
  widthY: number
): void {
  const steps = Math.max(8, Math.round(xEnd - xStart));
  let px = xStart;
  let py = frequencyToY(fStart, stamp.height);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = xStart + (xEnd - xStart) * t;
    const baseFreq = fStart + (fEnd - fStart) * t;
    const wobble = Math.sin(t * Math.PI * 2 * wobbleRate) * wobbleHz;
    const y = frequencyToY(clamp(baseFreq + wobble, 20, 19500), stamp.height);
    addSoftLine(stamp, px, py, x, y, 1.1, widthY, amp, grain);
    px = x;
    py = y;
  }
}

function createStampMetadata(preset: { category: StampCategory; name: string; description: string; legacy?: boolean }): Omit<StampPreset, 'id' | 'name' | 'description' | 'category' | 'stamp' | 'legacy'> {
  const categoryDefaults: Record<StampCategory, Omit<StampPreset, 'id' | 'name' | 'description' | 'category' | 'stamp' | 'legacy' | 'tags' | 'notes'>> = {
    melodic: { previewColor: '#7dd3fc', spectralRole: 'pitched-decay', pitched: true, percussive: false, decayType: 'medium', recommendedRenderModes: ['additive', 'ifft'], defaultSize: 18, defaultIntensity: 0.52 },
    harmonic: { previewColor: '#a78bfa', spectralRole: 'harmonic-body', pitched: true, percussive: false, decayType: 'long', recommendedRenderModes: ['additive', 'ifft'], defaultSize: 24, defaultIntensity: 0.46 },
    vocal: { previewColor: '#f9a8d4', spectralRole: 'formant-motion', pitched: true, percussive: false, decayType: 'bloom', recommendedRenderModes: ['ifft', 'granular'], defaultSize: 22, defaultIntensity: 0.5 },
    attack: { previewColor: '#fbbf24', spectralRole: 'percussive-decay', pitched: false, percussive: true, decayType: 'short', recommendedRenderModes: ['granular', 'ifft'], defaultSize: 14, defaultIntensity: 0.62 },
    texture: { previewColor: '#67e8f9', spectralRole: 'texture-noise', pitched: false, percussive: false, decayType: 'medium', recommendedRenderModes: ['granular', 'ifft'], defaultSize: 28, defaultIntensity: 0.42 },
    transform: { previewColor: '#c4b5fd', spectralRole: 'transform-shape', pitched: false, percussive: false, decayType: 'none', recommendedRenderModes: ['ifft', 'granular'], defaultSize: 24, defaultIntensity: 0.48 },
    legacy: { previewColor: '#f59e0b', spectralRole: 'legacy-reference', pitched: false, percussive: false, decayType: 'medium', recommendedRenderModes: ['additive', 'ifft'], defaultSize: 22, defaultIntensity: 0.5 },
  };

  const defaults = categoryDefaults[preset.category];
  const name = preset.name.toLowerCase();
  const tags = new Set<string>();
  if (defaults.pitched) tags.add('pitched');
  if (defaults.percussive) tags.add('percussive');
  if (preset.category === 'texture') tags.add('texture');
  if (preset.category === 'vocal') tags.add('formant');
  if (name.includes('bell') || name.includes('gamelan') || name.includes('plate') || name.includes('glass') || name.includes('metal')) tags.add('metal');
  if (name.includes('kick') || name.includes('snare') || name.includes('hat') || name.includes('clap') || name.includes('rim') || name.includes('tom')) tags.add('drum');
  if (name.includes('vowel') || name.includes('reed') || name.includes('jaw harp') || name.includes('jaw-harp')) tags.add('vocalish');
  if (name.includes('kalimba') || name.includes('tine') || name.includes('piano') || name.includes('vibra') || name.includes('tubular') || name.includes('handpan')) tags.add('decay');
  if (preset.legacy) tags.add('legacy');

  let decayType = defaults.decayType;
  if (name.includes('bloom') || name.includes('sweep')) decayType = 'bloom';
  if (name.includes('wash') || name.includes('shimmer')) decayType = 'long';
  if (name.includes('click') || name.includes('rim') || name.includes('needle')) decayType = 'short';

  return {
    ...defaults,
    decayType,
    tags: Array.from(tags),
    notes: preset.description,
  };
}

function finalizePreset(preset: { id: string; name: string; description: string; category: StampCategory; stamp: StampData; legacy?: boolean }): StampPreset {
  return {
    ...preset,
    ...createStampMetadata(preset),
  };
}

function cloneStamp(stamp: StampData): StampData {
  return {
    width: stamp.width,
    height: stamp.height,
    data: stamp.data.slice(),
    grainData: stamp.grainData.slice(),
  };
}

function createRisingThirdCall(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.62);
  const notes = [220, 277.18, 329.63, 392];
  const starts = [18, 70, 122, 174];
  notes.forEach((freq, i) => addHarmonicLine(stamp, starts[i], starts[i] + 34, freq, freq * (i % 2 ? 0.99 : 1.02), 4, 0.82, 0.66, 1.15));
  return stamp;
}

function createZigzagPentatonic(): StampData {
  const stamp = createEmptyStamp(250, 256, 0.6);
  const notes = [196, 293.66, 220, 329.63, 246.94, 392];
  const gap = 34;
  notes.forEach((f, i) => addHarmonicLine(stamp, 14 + i * gap, 14 + i * gap + 20, f, f * 1.01, 4, 0.78, 0.62, 1));
  return stamp;
}

function createGlideCall(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.58);
  addRibbon(stamp, 18, 204, 280, 510, 18, 2.3, 0.72, 0.6, 1.8);
  addHarmonicLine(stamp, 18, 204, 280, 510, 4, 0.52, 0.62, 1);
  return stamp;
}

function createMirrorWaltz(): StampData {
  const stamp = createEmptyStamp(270, 256, 0.6);
  const notesA = [174.61, 220, 261.63, 220, 293.66, 220];
  notesA.forEach((f, i) => addHarmonicLine(stamp, 16 + i * 36, 34 + i * 36, f, f, 3, 0.74, 0.6, 0.95));
  notesA.slice().reverse().forEach((f, i) => addHarmonicLine(stamp, 16 + i * 36, 34 + i * 36, f * 1.5, f * 1.5, 2, 0.33, 0.5, 0.85));
  return stamp;
}

function createModalLantern(): StampData {
  const stamp = createEmptyStamp(255, 256, 0.62);
  const notes = [146.83, 174.61, 220, 261.63, 220, 174.61, 196];
  notes.forEach((f, i) => addHarmonicLine(stamp, 18 + i * 32, 40 + i * 32, f, f * 1.015, 4, 0.72, 0.64, 1.05));
  return stamp;
}

function createOvertoneLadder(): StampData {
  const stamp = createEmptyStamp(220, 256, 0.82);
  addHarmonicLine(stamp, 26, 194, 110, 110, 8, 0.95, 0.86, 1.1);
  return stamp;
}

function createOpenFifthFrame(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.76);
  addHarmonicLine(stamp, 24, 204, 98, 98, 6, 0.6, 0.76, 1.1);
  addHarmonicLine(stamp, 24, 204, 147, 147, 5, 0.55, 0.74, 1.1);
  addHarmonicLine(stamp, 24, 204, 196, 196, 4, 0.45, 0.72, 1.05);
  return stamp;
}

function createSuspendedCloud(): StampData {
  const stamp = createEmptyStamp(260, 256, 0.72);
  addHarmonicLine(stamp, 20, 230, 220, 233, 5, 0.48, 0.72, 1.4);
  addHarmonicLine(stamp, 28, 238, 293.66, 310, 4, 0.46, 0.72, 1.35);
  addHarmonicLine(stamp, 18, 220, 392, 380, 3, 0.32, 0.72, 1.25);
  addCloud(stamp, 130, frequencyToY(2700, stamp.height), 58, 26, 90, 0.08, 0.38, 0.62, 304);
  return stamp;
}

function createOrganPillar(): StampData {
  const stamp = createEmptyStamp(220, 256, 0.8);
  addHarmonicLine(stamp, 28, 188, 65.41, 65.41, 9, 0.86, 0.82, 1.1);
  addHarmonicLine(stamp, 28, 188, 130.81, 130.81, 7, 0.62, 0.8, 1.05);
  return stamp;
}

function createShepardRamp(): StampData {
  const stamp = createEmptyStamp(260, 256, 0.74);
  addHarmonicLine(stamp, 20, 230, 110, 165, 5, 0.66, 0.72, 1.2);
  addHarmonicLine(stamp, 20, 230, 220, 330, 5, 0.58, 0.72, 1.2);
  addHarmonicLine(stamp, 20, 230, 440, 660, 5, 0.45, 0.72, 1.1);
  return stamp;
}

function createAhBody(): StampData {
  const stamp = createEmptyStamp(220, 256, 0.68);
  addHarmonicLine(stamp, 30, 180, 180, 190, 4, 0.38, 0.62, 1.1);
  addFormantBand(stamp, 24, 188, 780, 820, 5.6, 0.55, 0.68);
  addFormantBand(stamp, 28, 184, 1280, 1360, 4.8, 0.44, 0.7);
  addFormantBand(stamp, 34, 176, 2550, 2700, 4.2, 0.26, 0.74);
  return stamp;
}

function createEeBeam(): StampData {
  const stamp = createEmptyStamp(220, 256, 0.66);
  addHarmonicLine(stamp, 28, 190, 220, 240, 4, 0.3, 0.62, 1);
  addFormantBand(stamp, 20, 194, 380, 420, 4.6, 0.32, 0.64);
  addFormantBand(stamp, 24, 190, 2100, 2400, 3.5, 0.5, 0.66);
  addFormantBand(stamp, 30, 180, 3200, 3500, 3.2, 0.28, 0.68);
  return stamp;
}

function createOoHollow(): StampData {
  const stamp = createEmptyStamp(220, 256, 0.7);
  addHarmonicLine(stamp, 26, 182, 120, 130, 4, 0.42, 0.68, 1.15);
  addFormantBand(stamp, 24, 186, 380, 430, 6.2, 0.56, 0.72);
  addFormantBand(stamp, 30, 176, 820, 900, 5.2, 0.34, 0.74);
  return stamp;
}

function createThroatFormant(): StampData {
  const stamp = createEmptyStamp(230, 256, 0.64);
  addHarmonicLine(stamp, 20, 196, 146, 166, 5, 0.4, 0.58, 1.1);
  addFormantBand(stamp, 22, 192, 520, 580, 6.8, 0.62, 0.66);
  addFormantBand(stamp, 36, 178, 1700, 1900, 3.8, 0.25, 0.6);
  return stamp;
}

function createWhisperVowel(): StampData {
  const stamp = createEmptyStamp(230, 256, 0.34);
  addCloud(stamp, 90, frequencyToY(2200, stamp.height), 50, 34, 120, 0.12, 0.1, 0.26, 406);
  addCloud(stamp, 148, frequencyToY(4100, stamp.height), 44, 40, 130, 0.1, 0.06, 0.22, 407);
  addFormantBand(stamp, 42, 176, 950, 1100, 4.5, 0.2, 0.28);
  return stamp;
}

function createPluckNeedle(): StampData {
  const stamp = createEmptyStamp(140, 256, 0.38);
  addHarmonicLine(stamp, 18, 28, 440, 448, 6, 0.96, 0.34, 1.15);
  addHarmonicLine(stamp, 28, 78, 448, 430, 5, 0.54, 0.32, 0.95);
  paintBlob(stamp, 16, frequencyToY(2800, stamp.height), 1.8, 8, 0.22, 0.2);
  return stamp;
}

function createBellCore(): StampData {
  const stamp = createEmptyStamp(170, 256, 0.42);
  addHarmonicLine(stamp, 16, 34, 523.25, 530, 7, 0.92, 0.4, 1.05);
  addRibbon(stamp, 34, 118, 530, 330, 70, 2.2, 0.3, 0.32, 1.5);
  addRibbon(stamp, 30, 122, 1060, 660, 120, 2.1, 0.22, 0.3, 1.8);
  return stamp;
}

function createMetalBurst(): StampData {
  const stamp = createEmptyStamp(180, 256, 0.28);
  addRibbon(stamp, 10, 60, 1400, 900, 240, 3.2, 0.5, 0.24, 2.1);
  addRibbon(stamp, 14, 68, 2800, 1700, 420, 3.5, 0.35, 0.22, 1.8);
  addCloud(stamp, 80, frequencyToY(3000, stamp.height), 28, 28, 110, 0.1, 0.04, 0.18, 510);
  return stamp;
}

function createClickLadder(): StampData {
  const stamp = createEmptyStamp(210, 256, 0.24);
  addPulseColumns(stamp, 20, 188, 12, 4200, 1200, 0.22, 0.12);
  addPulseColumns(stamp, 22, 192, 24, 1800, 700, 0.3, 0.18);
  return stamp;
}

function createSnapRake(): StampData {
  const stamp = createEmptyStamp(200, 256, 0.36);
  addRibbon(stamp, 14, 96, 320, 1900, 35, 4.2, 0.42, 0.3, 1.4);
  addRibbon(stamp, 26, 108, 380, 2600, 44, 4.4, 0.28, 0.26, 1.2);
  addHarmonicLine(stamp, 18, 78, 210, 250, 4, 0.38, 0.4, 0.9);
  return stamp;
}

function createGrainMist(): StampData {
  const stamp = createEmptyStamp(220, 256, 0.45);
  addCloud(stamp, 78, frequencyToY(5200, stamp.height), 36, 42, 180, 0.12, 0.08, 0.35, 610);
  addCloud(stamp, 126, frequencyToY(3600, stamp.height), 42, 48, 220, 0.13, 0.12, 0.4, 611);
  addCloud(stamp, 164, frequencyToY(7200, stamp.height), 28, 34, 120, 0.11, 0.06, 0.28, 612);
  return stamp;
}

function createAirBand(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.3);
  addCloud(stamp, 80, frequencyToY(7800, stamp.height), 44, 16, 120, 0.08, 0.05, 0.18, 701);
  addCloud(stamp, 158, frequencyToY(9200, stamp.height), 52, 18, 130, 0.08, 0.05, 0.16, 702);
  addSoftLine(stamp, 30, frequencyToY(8500, stamp.height), 208, frequencyToY(9100, stamp.height), 1.2, 4.8, 0.09, 0.18);
  return stamp;
}

function createShimmerRain(): StampData {
  const stamp = createEmptyStamp(230, 256, 0.32);
  addPulseColumns(stamp, 18, 210, 10, 6400, 2200, 0.14, 0.1);
  addCloud(stamp, 118, frequencyToY(5000, stamp.height), 80, 56, 180, 0.06, 0.08, 0.2, 711);
  return stamp;
}

function createFrostNoise(): StampData {
  const stamp = createEmptyStamp(220, 256, 0.18);
  addCloud(stamp, 108, frequencyToY(9800, stamp.height), 86, 44, 320, 0.075, 0.02, 0.11, 720);
  addCloud(stamp, 140, frequencyToY(6800, stamp.height), 50, 34, 180, 0.05, 0.03, 0.12, 721);
  return stamp;
}

function createVelvetHiss(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.26);
  addSoftLine(stamp, 18, frequencyToY(1900, stamp.height), 220, frequencyToY(2400, stamp.height), 1.4, 8.5, 0.1, 0.2);
  addCloud(stamp, 120, frequencyToY(3000, stamp.height), 70, 22, 180, 0.08, 0.08, 0.22, 735);
  return stamp;
}

function createDiamondBody(): StampData {
  const stamp = createEmptyStamp(200, 256, 0.56);
  const cy = frequencyToY(1200, stamp.height);
  addDiamond(stamp, 100, cy, 66, 38, 1, 0.58);
  addSoftLine(stamp, 38, cy, 100, frequencyToY(700, stamp.height), 1.1, 1.7, 0.18, 0.48);
  addSoftLine(stamp, 100, frequencyToY(700, stamp.height), 162, cy, 1.1, 1.7, 0.18, 0.48);
  addSoftLine(stamp, 38, cy, 100, frequencyToY(2200, stamp.height), 1.1, 1.7, 0.18, 0.48);
  addSoftLine(stamp, 100, frequencyToY(2200, stamp.height), 162, cy, 1.1, 1.7, 0.18, 0.48);
  return stamp;
}

function createFanBridge(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.52);
  const x0 = 26;
  const x1 = 210;
  const starts = [220, 280, 360, 460];
  const ends = [520, 880, 1320, 1850];
  for (let i = 0; i < starts.length; i++) {
    addSoftLine(
      stamp,
      x0,
      frequencyToY(starts[i], stamp.height),
      x1,
      frequencyToY(ends[i], stamp.height),
      1,
      1.5 + i * 0.35,
      0.3 - i * 0.04,
      0.44
    );
  }
  return stamp;
}

function createCrossLattice(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.5);
  addRibbon(stamp, 20, 216, 260, 2200, 0, 1, 0.22, 0.5, 1.5);
  addRibbon(stamp, 20, 216, 2200, 260, 0, 1, 0.22, 0.5, 1.5);
  addRibbon(stamp, 20, 216, 400, 3200, 20, 3, 0.16, 0.48, 1.2);
  addRibbon(stamp, 20, 216, 3200, 400, 20, 3, 0.16, 0.48, 1.2);
  return stamp;
}

function createSpiralKnot(): StampData {
  const stamp = createEmptyStamp(260, 256, 0.46);
  const cx = 126;
  const cy = frequencyToY(1200, stamp.height);
  const turns = 3.4;
  const steps = 220;
  let px = cx;
  let py = cy;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const angle = t * Math.PI * 2 * turns;
    const radiusX = 10 + t * 84;
    const radiusY = 8 + t * 34;
    const x = cx + Math.cos(angle) * radiusX;
    const y = cy + Math.sin(angle) * radiusY;
    addSoftLine(stamp, px, py, x, y, 0.95, 1.4, 0.2 + t * 0.12, 0.42);
    px = x;
    py = y;
  }
  return stamp;
}

function createBarcodeGrid(): StampData {
  const stamp = createEmptyStamp(250, 256, 0.5);
  const next = rng(880);
  for (let x = 16; x < 232; x += 6) {
    const height = 22 + next() * 170;
    const baseY = 26 + next() * 42;
    for (let y = 0; y < height; y++) {
      addPoint(stamp, x, baseY + y, 0.22, 0.52);
      addPoint(stamp, x + 1, baseY + y, 0.15, 0.5);
    }
  }
  addSoftLine(stamp, 14, frequencyToY(1700, stamp.height), 230, frequencyToY(1700, stamp.height), 1, 1.2, 0.12, 0.44);
  return stamp;
}

function createViolinBow(): StampData {
  const stamp = createEmptyStamp(260, 256, 0.72);
  addHarmonicLine(stamp, 20, 232, 196, 212, 9, 0.78, 0.72, 1.05);
  addRibbon(stamp, 24, 228, 2900, 3600, 85, 3.2, 0.12, 0.38, 2.4);
  addRibbon(stamp, 24, 228, 4800, 6200, 120, 2.5, 0.08, 0.28, 2.8);
  return stamp;
}

function createClarinetChirp(): StampData {
  const stamp = createEmptyStamp(210, 256, 0.64);
  addOddHarmonicLine(stamp, 18, 170, 220, 260, 6, 0.84, 0.62, 1.1);
  addFormantBand(stamp, 30, 178, 1400, 1800, 3.8, 0.18, 0.52);
  return stamp;
}

function createFluteBreath(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.48);
  addHarmonicLine(stamp, 26, 210, 523.25, 546, 4, 0.56, 0.5, 0.95);
  addCloud(stamp, 126, frequencyToY(6200, stamp.height), 62, 24, 160, 0.06, 0.06, 0.22, 1101);
  addSoftLine(stamp, 30, frequencyToY(7800, stamp.height), 210, frequencyToY(8600, stamp.height), 1.2, 5.5, 0.06, 0.16);
  return stamp;
}

function createTrumpetCall(): StampData {
  const stamp = createEmptyStamp(220, 256, 0.66);
  addHarmonicLine(stamp, 18, 72, 233.08, 246.94, 7, 0.88, 0.64, 1.2);
  addHarmonicLine(stamp, 72, 168, 246.94, 246.94, 7, 0.74, 0.64, 1.15);
  addFormantBand(stamp, 24, 170, 1200, 1500, 4.2, 0.16, 0.44);
  return stamp;
}

function createChoirBloom(): StampData {
  const stamp = createEmptyStamp(250, 256, 0.7);
  addHarmonicLine(stamp, 20, 214, 174.61, 196, 5, 0.44, 0.68, 1.25);
  addFormantBand(stamp, 26, 210, 720, 860, 6, 0.34, 0.7);
  addFormantBand(stamp, 34, 202, 1180, 1460, 5.5, 0.28, 0.72);
  addCloud(stamp, 160, frequencyToY(3200, stamp.height), 50, 22, 90, 0.06, 0.24, 0.46, 1102);
  return stamp;
}

function createReedDrone(): StampData {
  const stamp = createEmptyStamp(260, 256, 0.62);
  addOddHarmonicLine(stamp, 18, 236, 110, 114, 7, 0.76, 0.6, 1.2);
  addRibbon(stamp, 18, 236, 900, 1200, 30, 5, 0.12, 0.34, 2.2);
  return stamp;
}

function createTineKeys(): StampData {
  const stamp = createEmptyStamp(210, 256, 0.4);
  addHarmonicLine(stamp, 18, 36, 329.63, 336, 6, 0.82, 0.34, 1);
  addRibbon(stamp, 36, 118, 660, 520, 45, 2.4, 0.22, 0.28, 1.5);
  addRibbon(stamp, 40, 126, 1980, 1240, 110, 2.8, 0.12, 0.24, 1.8);
  return stamp;
}

function createKickBody(): StampData {
  const stamp = createEmptyStamp(170, 256, 0.28);
  addRibbon(stamp, 10, 70, 110, 46, 0, 1, 0.84, 0.22, 3.8);
  addCloud(stamp, 24, frequencyToY(2400, stamp.height), 14, 12, 70, 0.1, 0.04, 0.16, 1103);
  return stamp;
}

function createSnareDust(): StampData {
  const stamp = createEmptyStamp(190, 256, 0.18);
  addCloud(stamp, 42, frequencyToY(2500, stamp.height), 28, 26, 180, 0.14, 0.03, 0.14, 1104);
  addCloud(stamp, 70, frequencyToY(4200, stamp.height), 34, 32, 200, 0.12, 0.02, 0.12, 1105);
  addHarmonicLine(stamp, 14, 48, 180, 165, 3, 0.22, 0.2, 0.9);
  return stamp;
}

function createCymbalWash(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.14);
  addCloud(stamp, 72, frequencyToY(7600, stamp.height), 52, 34, 260, 0.09, 0.02, 0.1, 1106);
  addCloud(stamp, 140, frequencyToY(10400, stamp.height), 68, 42, 320, 0.08, 0.01, 0.08, 1107);
  addSoftLine(stamp, 24, frequencyToY(6400, stamp.height), 220, frequencyToY(11200, stamp.height), 1.2, 6.2, 0.07, 0.08);
  return stamp;
}

function createGamelanPlate(): StampData {
  const stamp = createEmptyStamp(210, 256, 0.26);
  addRibbon(stamp, 14, 120, 520, 360, 130, 2.1, 0.34, 0.22, 1.9);
  addRibbon(stamp, 18, 124, 910, 610, 210, 2.7, 0.26, 0.18, 1.8);
  addRibbon(stamp, 20, 130, 1480, 980, 260, 3.2, 0.18, 0.16, 1.6);
  return stamp;
}

function createLaserZap(): StampData {
  const stamp = createEmptyStamp(200, 256, 0.22);
  addRibbon(stamp, 14, 156, 3200, 260, 220, 1.6, 0.4, 0.16, 1.6);
  addRibbon(stamp, 22, 160, 6800, 900, 480, 2.2, 0.18, 0.12, 1.2);
  return stamp;
}

function createGlassOrb(): StampData {
  const stamp = createEmptyStamp(210, 256, 0.36);
  const cy = frequencyToY(2100, stamp.height);
  addDiamond(stamp, 106, cy, 52, 24, 0.92, 0.34);
  addCloud(stamp, 108, cy, 26, 14, 90, 0.05, 0.08, 0.18, 1108);
  addSoftLine(stamp, 44, frequencyToY(1200, stamp.height), 166, frequencyToY(3000, stamp.height), 0.9, 1.1, 0.09, 0.22);
  addSoftLine(stamp, 44, frequencyToY(3000, stamp.height), 166, frequencyToY(1200, stamp.height), 0.9, 1.1, 0.09, 0.22);
  return stamp;
}

function createKalimbaTine(): StampData {
  const stamp = createEmptyStamp(190, 256, 0.36);
  addHarmonicLine(stamp, 14, 30, 392, 398, 6, 0.92, 0.28, 1);
  addRibbon(stamp, 30, 132, 760, 540, 38, 2.2, 0.18, 0.26, 1.6);
  addRibbon(stamp, 34, 138, 2140, 1180, 140, 2.8, 0.12, 0.22, 1.8);
  return stamp;
}

function createMutedPianoNote(): StampData {
  const stamp = createEmptyStamp(200, 256, 0.34);
  addHarmonicLine(stamp, 16, 28, 261.63, 266, 7, 0.94, 0.24, 1);
  addRibbon(stamp, 28, 118, 520, 420, 18, 2.1, 0.2, 0.24, 1.5);
  addRibbon(stamp, 30, 124, 1560, 980, 60, 2.5, 0.12, 0.18, 1.4);
  return stamp;
}

function createTubularBell(): StampData {
  const stamp = createEmptyStamp(220, 256, 0.3);
  addRibbon(stamp, 16, 118, 587, 420, 80, 1.8, 0.34, 0.18, 1.8);
  addRibbon(stamp, 18, 122, 1160, 880, 120, 2.1, 0.24, 0.16, 1.8);
  addRibbon(stamp, 20, 128, 1720, 1260, 200, 2.6, 0.18, 0.14, 1.6);
  return stamp;
}

function createHandpanDing(): StampData {
  const stamp = createEmptyStamp(220, 256, 0.32);
  addRibbon(stamp, 12, 110, 440, 350, 48, 1.9, 0.34, 0.2, 1.7);
  addRibbon(stamp, 14, 118, 880, 660, 110, 2.2, 0.18, 0.18, 1.6);
  addCloud(stamp, 40, frequencyToY(2600, stamp.height), 20, 18, 90, 0.06, 0.06, 0.18, 2101);
  return stamp;
}

function createOpenHatShimmer(): StampData {
  const stamp = createEmptyStamp(230, 256, 0.12);
  addCloud(stamp, 26, frequencyToY(8200, stamp.height), 22, 18, 160, 0.16, 0.02, 0.1, 2102);
  addCloud(stamp, 92, frequencyToY(10600, stamp.height), 70, 38, 280, 0.08, 0.01, 0.08, 2103);
  addSoftLine(stamp, 18, frequencyToY(7200, stamp.height), 214, frequencyToY(12600, stamp.height), 1.2, 5.8, 0.07, 0.08);
  return stamp;
}

function createWoodRimClick(): StampData {
  const stamp = createEmptyStamp(150, 256, 0.22);
  addCloud(stamp, 18, frequencyToY(3400, stamp.height), 10, 14, 70, 0.16, 0.03, 0.14, 2104);
  addHarmonicLine(stamp, 16, 34, 820, 760, 3, 0.32, 0.18, 0.8);
  return stamp;
}

function createBrushedSnare(): StampData {
  const stamp = createEmptyStamp(210, 256, 0.18);
  addCloud(stamp, 24, frequencyToY(2100, stamp.height), 22, 24, 140, 0.14, 0.03, 0.12, 2105);
  addCloud(stamp, 86, frequencyToY(4600, stamp.height), 60, 36, 220, 0.08, 0.02, 0.1, 2106);
  addHarmonicLine(stamp, 14, 42, 190, 170, 3, 0.18, 0.2, 0.9);
  return stamp;
}

function createLegacyBellConstellation(): StampData {
  const stamp = createEmptyStamp(250, 256, 0.42);
  const notes = [440, 660, 550, 880, 740, 990];
  notes.forEach((f, i) => addHarmonicLine(stamp, 16 + i * 34, 32 + i * 34, f, f * 1.015, 6, 0.7, 0.4, 1));
  addRibbon(stamp, 22, 220, 4800, 1200, 140, 2.8, 0.14, 0.24, 1.8);
  return stamp;
}

function createLegacyDuskOrgan(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.74);
  addHarmonicLine(stamp, 20, 220, 82.41, 82.41, 8, 0.78, 0.72, 1.2);
  addHarmonicLine(stamp, 24, 214, 164.81, 164.81, 6, 0.46, 0.68, 1.2);
  addCloud(stamp, 160, frequencyToY(2400, stamp.height), 56, 30, 80, 0.08, 0.34, 0.58, 920);
  return stamp;
}

function createLegacyVowelSigh(): StampData {
  const stamp = createEmptyStamp(230, 256, 0.63);
  addHarmonicLine(stamp, 16, 196, 180, 230, 5, 0.4, 0.58, 1.1);
  addFormantBand(stamp, 24, 190, 700, 1000, 5.8, 0.4, 0.66);
  addFormantBand(stamp, 26, 184, 1200, 1900, 4.6, 0.34, 0.66);
  addRibbon(stamp, 160, 220, 3800, 900, 80, 1.5, 0.1, 0.3, 2.2);
  return stamp;
}

function createLegacyMarimbaGlint(): StampData {
  const stamp = createEmptyStamp(180, 256, 0.34);
  addHarmonicLine(stamp, 16, 28, 370, 380, 6, 0.92, 0.28, 1);
  addHarmonicLine(stamp, 28, 78, 380, 340, 5, 0.44, 0.26, 0.95);
  addPulseColumns(stamp, 24, 136, 16, 4200, 900, 0.15, 0.12);
  return stamp;
}

function createLegacyMistShimmer(): StampData {
  const stamp = createEmptyStamp(240, 256, 0.3);
  addCloud(stamp, 110, frequencyToY(5200, stamp.height), 80, 42, 260, 0.08, 0.05, 0.2, 950);
  addRibbon(stamp, 30, 214, 900, 2200, 35, 2.4, 0.12, 0.24, 2.2);
  return stamp;
}

function createLegacyAuroraStack(): StampData {
  const stamp = createEmptyStamp(260, 256, 0.56);
  addHarmonicLine(stamp, 24, 236, 140, 210, 5, 0.48, 0.52, 1.3);
  addHarmonicLine(stamp, 24, 236, 280, 420, 5, 0.36, 0.5, 1.2);
  addRibbon(stamp, 40, 226, 2500, 6200, 120, 2.2, 0.13, 0.36, 3.2);
  return stamp;
}

type RawStampPreset = { id: string; name: string; description: string; category: StampCategory; stamp: StampData; legacy?: boolean };

function legacyPreset(id: string, name: string, description: string, baseFactory: () => StampData): RawStampPreset {
  return {
    id,
    name,
    description,
    category: 'legacy',
    legacy: true,
    stamp: baseFactory(),
  };
}

const CORE_PRESETS: RawStampPreset[] = [
  { id: 'rising-third-call', name: 'Rising Third Call', description: 'Klarer vierteiliger Aufruf in kleinen Terzschritten.', category: 'melodic', stamp: createRisingThirdCall() },
  { id: 'zigzag-pentatonic', name: 'Zigzag Pentatonic', description: 'Springende pentatonische Figur mit klarer Zickzack-Struktur.', category: 'melodic', stamp: createZigzagPentatonic() },
  { id: 'glide-call', name: 'Glide Call', description: 'Geschwungene melodische Linie mit weicher Ziehbewegung.', category: 'melodic', stamp: createGlideCall() },
  { id: 'mirror-waltz', name: 'Mirror Waltz', description: 'Spiegelartige 3/4-Motivstruktur mit oberer Antwortfigur.', category: 'melodic', stamp: createMirrorWaltz() },
  { id: 'modal-lantern', name: 'Modal Lantern', description: 'Modale Phrase mit warmem Mittenfokus.', category: 'melodic', stamp: createModalLantern() },
  { id: 'violin-bow', name: 'Violin Bow', description: 'Streichartiger Bogenklang mit rosinigem Hoehenanteil.', category: 'melodic', stamp: createViolinBow() },
  { id: 'clarinet-chirp', name: 'Clarinet Chirp', description: 'Rohrblattartige Figur mit odd-harmonic Fokus.', category: 'melodic', stamp: createClarinetChirp() },
  { id: 'flute-breath', name: 'Flute Breath', description: 'Heller Floetenton mit Luftanteil im oberen Spektrum.', category: 'melodic', stamp: createFluteBreath() },
  { id: 'trumpet-call', name: 'Trumpet Call', description: 'Brass-artiger Anruf mit kompaktem Resonanzkern.', category: 'melodic', stamp: createTrumpetCall() },

  { id: 'overtone-ladder', name: 'Overtone Ladder', description: 'Neutraler Grundton mit sauberem Obertonkamm.', category: 'harmonic', stamp: createOvertoneLadder() },
  { id: 'open-fifth-frame', name: 'Open Fifth Frame', description: 'Offener harmonischer Rahmen aus Grundton, Quinte und Oktavbezug.', category: 'harmonic', stamp: createOpenFifthFrame() },
  { id: 'suspended-cloud', name: 'Suspended Cloud', description: 'Schwebende Harmoniefläche mit weichem oberen Nebel.', category: 'harmonic', stamp: createSuspendedCloud() },
  { id: 'organ-pillar', name: 'Organ Pillar', description: 'Tiefer Pfeilerklang mit breiter Obertonstabilitaet.', category: 'harmonic', stamp: createOrganPillar() },
  { id: 'shepard-ramp', name: 'Shepard Ramp', description: 'Illusionsartige gestapelte Aufwaertsbewegung.', category: 'harmonic', stamp: createShepardRamp() },
  { id: 'choir-bloom', name: 'Choir Bloom', description: 'Chorartige vokale Flaeche mit resonanter Mittenoeffnung.', category: 'harmonic', stamp: createChoirBloom() },
  { id: 'reed-drone', name: 'Reed Drone', description: 'Dunkler Drone-Koerper mit rohrblattartigem Odd-Partial-Charakter.', category: 'harmonic', stamp: createReedDrone() },

  { id: 'ah-body', name: 'Ah Body', description: 'Warmer vokalartiger Resonanzkoerper mit klaren Formantbaendern.', category: 'vocal', stamp: createAhBody() },
  { id: 'ee-beam', name: 'Ee Beam', description: 'Heller fokussierter Vokalstrahl mit engem Formantschwerpunkt.', category: 'vocal', stamp: createEeBeam() },
  { id: 'oo-hollow', name: 'Oo Hollow', description: 'Runder hohler Vokalkoerper mit tiefer Resonanz.', category: 'vocal', stamp: createOoHollow() },
  { id: 'throat-formant', name: 'Throat Formant', description: 'Dunkler rauerer Kehllaut-Korpus.', category: 'vocal', stamp: createThroatFormant() },
  { id: 'whisper-vowel', name: 'Whisper Vowel', description: 'Atemhafter Vokalnebel mit losem Formantkern.', category: 'vocal', stamp: createWhisperVowel() },

  { id: 'pluck-needle', name: 'Pluck Needle', description: 'Kurzer praeziser Attack-Stempel mit schnellem Auslauf.', category: 'attack', stamp: createPluckNeedle() },
  { id: 'bell-core', name: 'Bell Core', description: 'Glockiger Kern mit inharmonischem Nachglanz.', category: 'attack', stamp: createBellCore() },
  { id: 'metal-burst', name: 'Metal Burst', description: 'Metallischer Spektralimpuls fuer perkussive Akzente.', category: 'attack', stamp: createMetalBurst() },
  { id: 'click-ladder', name: 'Click Ladder', description: 'Repetitive Klicksaeulen fuer rhythmische Spitzen.', category: 'attack', stamp: createClickLadder() },
  { id: 'snap-rake', name: 'Snap Rake', description: 'Kratzende Attack-Faecher mit tonalem Unterzug.', category: 'attack', stamp: createSnapRake() },
  { id: 'kalimba-tine', name: 'Kalimba Tine', description: 'Klarer Daumenklavier-Klang mit natuerlichem metallischem Decay.', category: 'melodic', stamp: createKalimbaTine() },
  { id: 'muted-piano-note', name: 'Muted Piano Note', description: 'Gedämpfter Klavierton mit natuerlichem pitched Decay.', category: 'melodic', stamp: createMutedPianoNote() },
  { id: 'tubular-bell', name: 'Tubular Bell', description: 'Pitch-eindeutiger Glockenton mit langsamem metallischem Ausklang.', category: 'melodic', stamp: createTubularBell() },
  { id: 'handpan-ding', name: 'Handpan Ding', description: 'Runder metallischer Ding-Klang mit singendem Nachschwingen.', category: 'melodic', stamp: createHandpanDing() },
  { id: 'tine-keys', name: 'Tine Keys', description: 'E-Piano-artiger Tine-Anschlag mit glasigem Nachglanz.', category: 'attack', stamp: createTineKeys() },
  { id: 'kick-body', name: 'Kick Body', description: 'Tiefer Kick-Koerper mit kurzer Click-Komponente.', category: 'attack', stamp: createKickBody() },
  { id: 'snare-dust', name: 'Snare Dust', description: 'Rauschiger Snare-Korpus mit losem tonalem Zentrum.', category: 'attack', stamp: createSnareDust() },
  { id: 'brushed-snare', name: 'Brushed Snare', description: 'Natürlich auslaufende Snare mit weicherer Bürstenhülle.', category: 'attack', stamp: createBrushedSnare() },
  { id: 'open-hat-shimmer', name: 'Open Hat Shimmer', description: 'Ausklingendes Hi-Hat-Fächerrauschen mit langem Höhenschwanz.', category: 'attack', stamp: createOpenHatShimmer() },
  { id: 'wood-rim-click', name: 'Wood Rim Click', description: 'Kurzer hölzerner Rim-Impuls mit kleinem pitched Restkern.', category: 'attack', stamp: createWoodRimClick() },
  { id: 'gamelan-plate', name: 'Gamelan Plate', description: 'Inharmonische Metallplatte mit fernem asiatischen Einschlag.', category: 'attack', stamp: createGamelanPlate() },

  { id: 'grain-mist', name: 'Grain Mist', description: 'Luftige kontrollierte Koernerwolke als Layer-Material.', category: 'texture', stamp: createGrainMist() },
  { id: 'air-band', name: 'Air Band', description: 'Feines Hoehenband fuer Atem und Schimmer.', category: 'texture', stamp: createAirBand() },
  { id: 'shimmer-rain', name: 'Shimmer Rain', description: 'Glitzernde punktuelle Regenstruktur in oberen Lagen.', category: 'texture', stamp: createShimmerRain() },
  { id: 'frost-noise', name: 'Frost Noise', description: 'Kalte dichte Hochtontextur ohne klaren Tonkern.', category: 'texture', stamp: createFrostNoise() },
  { id: 'velvet-hiss', name: 'Velvet Hiss', description: 'Seidiger Rauschstreifen fuer subtile Atmosphaere.', category: 'texture', stamp: createVelvetHiss() },
  { id: 'cymbal-wash', name: 'Cymbal Wash', description: 'Breite Hochtonflaeche wie ein ausklingendes Becken.', category: 'texture', stamp: createCymbalWash() },

  { id: 'diamond-body', name: 'Diamond Body', description: 'Symmetrischer Klangkoerper fuer Rotation und Morph.', category: 'transform', stamp: createDiamondBody() },
  { id: 'laser-zap', name: 'Laser Zap', description: 'Sci-fi-artiger Spektralsweep fuer futuristische Akzente.', category: 'transform', stamp: createLaserZap() },
  { id: 'glass-orb', name: 'Glass Orb', description: 'Glasige Resonanzkugel als rotierbares Klangobjekt.', category: 'transform', stamp: createGlassOrb() },
  { id: 'fan-bridge', name: 'Fan Bridge', description: 'Auffaechernde Brueckenform zwischen engem Start und breitem Ende.', category: 'transform', stamp: createFanBridge() },
  { id: 'cross-lattice', name: 'Cross Lattice', description: 'Kreuzendes Gitter als transformierbarer Strukturbaustein.', category: 'transform', stamp: createCrossLattice() },
  { id: 'spiral-knot', name: 'Spiral Knot', description: 'Spiralflaeche fuer Twirl- und Warp-Experimente.', category: 'transform', stamp: createSpiralKnot() },
  { id: 'barcode-grid', name: 'Barcode Grid', description: 'Grafische Rastersaeulen als rhythmisch-spektrales Rohmaterial.', category: 'transform', stamp: createBarcodeGrid() },
];

const LEGACY_PRESETS: RawStampPreset[] = [
  legacyPreset('legacy-bell-constellation', 'Bell Constellation (Legacy)', 'Frueheres glitzerndes Glocken-Arpeggio mit Sweep-Auslauf.', createLegacyBellConstellation),
  legacyPreset('legacy-dusk-organ', 'Dusk Organ (Legacy)', 'Frueherer breiter Orgelstapel aus dem ersten Designzyklus.', createLegacyDuskOrgan),
  legacyPreset('legacy-vowel-sigh', 'Vowel Sigh (Legacy)', 'Aeltere vokalartige Form mit starkem Nachzug.', createLegacyVowelSigh),
  legacyPreset('legacy-marimba-glint', 'Marimba Glint (Legacy)', 'Aelterer perkussiver Motivstempel mit Klickanteil.', createLegacyMarimbaGlint),
  legacyPreset('legacy-mist-shimmer', 'Mist Shimmer (Legacy)', 'Aeltere Mischtextur mit tonalem Zug.', createLegacyMistShimmer),
  legacyPreset('legacy-aurora-stack', 'Aurora Stack (Legacy)', 'Aeltere breit gestapelte Flaechenstruktur.', createLegacyAuroraStack),
];

const PRESETS: StampPreset[] = [...CORE_PRESETS, ...LEGACY_PRESETS].map(finalizePreset);

export const stampPresets: StampPreset[] = PRESETS.map((preset) => ({
  ...preset,
  tags: [...preset.tags],
  recommendedRenderModes: [...preset.recommendedRenderModes],
  stamp: cloneStamp(preset.stamp),
}));

export function getStampPreset(id: string): StampPreset | null {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) return null;
  return {
    ...preset,
    tags: [...preset.tags],
    recommendedRenderModes: [...preset.recommendedRenderModes],
    stamp: cloneStamp(preset.stamp),
  };
}
