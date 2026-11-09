import type { SpectralData } from '../audio/SpectralData';

export type HarmonizerType = 'overtones' | 'intervals' | 'inharmonic' | 'spectralBlur';

export type HarmonizerParams = Record<string, number>;

export type SpectralOperationHostState = {
  spectralData: SpectralData;
  pushUndo: () => void;
  renderVersion: number;
  audioBufferDirty: boolean;
};

type StoreSet<T extends SpectralOperationHostState> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
type StoreGet<T extends SpectralOperationHostState> = () => T;

export type SpectralOperationStoreActions = {
  applyHarmonizer: (type: HarmonizerType, params?: HarmonizerParams) => void;
};

export function applySpectralHarmonizerToData(
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

export function createSpectralOperationStoreActions<T extends SpectralOperationHostState>(
  set: StoreSet<T>,
  get: StoreGet<T>
): SpectralOperationStoreActions {
  return {
    applyHarmonizer: (type, params = {}) => {
      const { spectralData } = get();
      get().pushUndo();
      applySpectralHarmonizerToData(spectralData, type, params);
      set((state) => ({ renderVersion: state.renderVersion + 1, audioBufferDirty: true } as Partial<T>));
    },
  };
}
