import { SpectralData } from '../src/features/l3lab/spectralForge/audio/SpectralData';
import {
  applySpectralHarmonizerToData,
  type HarmonizerParams,
  type HarmonizerType,
} from '../src/features/l3lab/spectralForge/state/storeSpectralOperations';

type ParityCase = {
  type: HarmonizerType;
  params: HarmonizerParams;
};

// harmonizer parity overtones
const cases: ParityCase[] = [
  { type: 'overtones', params: { harmonics: 4, decay: 0.42 } },
  { type: 'intervals', params: { semitones: 7, amount: 0.63 } },
  { type: 'inharmonic', params: { partials: 4, spread: 1.37, decay: 0.48 } },
  { type: 'spectralBlur', params: { radius: 2 } },
];

function seedSpectralData(): SpectralData {
  const spectralData = new SpectralData(24, 18);
  const points = [
    [2, 4, 0.21],
    [4, 7, 0.73],
    [8, 12, 0.49],
    [13, 3, 0.91],
    [17, 9, 0.33],
    [22, 15, 0.64],
  ] as const;
  points.forEach(([x, y, amp], index) => {
    spectralData.set(x, y, amp);
    spectralData.setGrain(x, y, 0.15 + index * 0.11);
  });
  return spectralData;
}

function applyLegacyInlineHarmonizer(
  spectralData: SpectralData,
  type: HarmonizerType,
  params: HarmonizerParams = {}
): void {
  const height = spectralData.height;
  const width = spectralData.width;

  switch (type) {
    case 'overtones': {
      const numHarmonics = params.harmonics ?? 6;
      const decay = params.decay ?? 0.5;
      const newData = spectralData.cloneData();
      // Extract amp data from combined snapshot
      const ampLen = width * height;
      const ampData = newData.subarray(0, ampLen);

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const amp = spectralData.get(x, y);
          if (amp < 0.05) continue;

          const normalized = 1 - y / height;
          const freq = 20 * Math.pow(1000, normalized);

          for (let h = 2; h <= numHarmonics + 1; h++) {
            const harmonicFreq = freq * h;
            if (harmonicFreq > 20000) break;
            const harmonicNorm = Math.log(harmonicFreq / 20) / Math.log(1000);
            const harmonicY = Math.round((1 - harmonicNorm) * height);
            if (harmonicY < 0 || harmonicY >= height) continue;
            const idx = harmonicY * width + x;
            ampData[idx] = Math.min(1, ampData[idx] + amp * Math.pow(decay, h - 1));
          }
        }
      }
      spectralData.restoreData(newData);
      break;
    }

    case 'intervals': {
      const semitones = params.semitones ?? 7;
      const ratio = Math.pow(2, semitones / 12);
      const amount = params.amount ?? 0.7;
      const newData = spectralData.cloneData();
      const ampLen = width * height;
      const ampData = newData.subarray(0, ampLen);

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const amp = spectralData.get(x, y);
          if (amp < 0.05) continue;
          const normalized = 1 - y / height;
          const freq = 20 * Math.pow(1000, normalized);
          const newFreq = freq * ratio;
          if (newFreq > 20000) continue;
          const newNorm = Math.log(newFreq / 20) / Math.log(1000);
          const newY = Math.round((1 - newNorm) * height);
          if (newY < 0 || newY >= height) continue;
          const idx = newY * width + x;
          ampData[idx] = Math.min(1, ampData[idx] + amp * amount);
        }
      }
      spectralData.restoreData(newData);
      break;
    }

    case 'inharmonic': {
      const partials = params.partials ?? 5;
      const spread = params.spread ?? 1.4;
      const decay = params.decay ?? 0.5;
      const newData = spectralData.cloneData();
      const ampLen = width * height;
      const ampData = newData.subarray(0, ampLen);

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const amp = spectralData.get(x, y);
          if (amp < 0.05) continue;
          const normalized = 1 - y / height;
          const freq = 20 * Math.pow(1000, normalized);

          for (let h = 2; h <= partials + 1; h++) {
            const harmonicFreq = freq * Math.pow(h, spread);
            if (harmonicFreq > 20000) break;
            const newNorm = Math.log(harmonicFreq / 20) / Math.log(1000);
            const newY = Math.round((1 - newNorm) * height);
            if (newY < 0 || newY >= height) continue;
            const idx = newY * width + x;
            ampData[idx] = Math.min(1, ampData[idx] + amp * Math.pow(decay, h - 1));
          }
        }
      }
      spectralData.restoreData(newData);
      break;
    }

    case 'spectralBlur': {
      const blurRadius = params.radius ?? 3;
      const newData = spectralData.cloneData();
      const ampLen = width * height;
      const ampData = newData.subarray(0, ampLen);

      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          let sum = 0;
          let count = 0;
          for (let ddx = -blurRadius; ddx <= blurRadius; ddx++) {
            for (let ddy = -blurRadius; ddy <= blurRadius; ddy++) {
              const nx = x + ddx;
              const ny = y + ddy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                sum += spectralData.get(nx, ny);
                count++;
              }
            }
          }
          ampData[y * width + x] = sum / count;
        }
      }
      spectralData.restoreData(newData);
      break;
    }
  }
}

function assertEqualSnapshot(actual: Float32Array, expected: Float32Array, label: string): void {
  if (actual.length !== expected.length) {
    throw new Error(`${label}: length mismatch ${actual.length} !== ${expected.length}`);
  }
  for (let index = 0; index < actual.length; index++) {
    if (actual[index] !== expected[index]) {
      throw new Error(`${label}: mismatch at ${index}: ${actual[index]} !== ${expected[index]}`);
    }
  }
}

const results = cases.map((testCase) => {
  const legacy = seedSpectralData();
  const extracted = seedSpectralData();
  applyLegacyInlineHarmonizer(legacy, testCase.type, testCase.params);
  applySpectralHarmonizerToData(extracted, testCase.type, testCase.params);
  assertEqualSnapshot(
    extracted.cloneData(),
    legacy.cloneData(),
    `harmonizer parity ${testCase.type}`
  );
  return {
    type: testCase.type,
    ok: true,
    snapshotLength: extracted.cloneData().length,
  };
});

console.log(JSON.stringify({
  ok: true,
  checkedScenarios: results.length,
  results,
}, null, 2));
