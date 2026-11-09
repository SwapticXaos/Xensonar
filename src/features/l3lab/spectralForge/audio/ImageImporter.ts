import { SpectralData } from './SpectralData';
import { markSpectralForgeImageObjectUrlReleased, registerSpectralForgeImageObjectUrl } from '../lifecycle/spectralForgePreviewLifecycleRegistry';

export type ImageImportFitMode = 'crop' | 'stretch' | 'containLeft' | 'containRight';
export type ImageImportReadMode = 'legacy' | 'contour' | 'hybrid';

export interface ImageImportOptions {
  fitMode: ImageImportFitMode;
  shiftX: number; // -1..1
  shiftY: number; // -1..1
  contrast: number; // 0..1
  readMode: ImageImportReadMode;
}

export interface ImportedImageInfo {
  imageWidth: number;
  imageHeight: number;
  fitMode: ImageImportFitMode;
  contrast: number;
  readMode: ImageImportReadMode;
}

export interface ImageLoadOptions {
  maxPixels?: number;
  maxDimension?: number;
}

async function cloneImageElementFromCanvas(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Bild konnte nach dem Herunterskalieren nicht vorbereitet werden');
  const url = URL.createObjectURL(blob);
  registerSpectralForgeImageObjectUrl(url, blob, 'clone-image-element-from-canvas', 'spectralForge/ImageImporter.cloneImageElementFromCanvas');
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Bild konnte nach dem Herunterskalieren nicht geladen werden'));
      el.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
    markSpectralForgeImageObjectUrlReleased(url, 'spectral-forge-canvas-clone-url-revoked');
  }
}

function computeSafeImageScale(width: number, height: number, options?: ImageLoadOptions): number {
  const maxPixels = options?.maxPixels ?? 4_200_000;
  const maxDimension = options?.maxDimension ?? 2304;
  const pixelScale = Math.sqrt(maxPixels / Math.max(1, width * height));
  const dimensionScale = maxDimension / Math.max(width, height, 1);
  return Math.min(1, pixelScale, dimensionScale);
}

export async function loadImageElementFromFile(file: File, options?: ImageLoadOptions): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  registerSpectralForgeImageObjectUrl(url, file, 'load-image-element-from-file', 'spectralForge/ImageImporter.loadImageElementFromFile');
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
      el.src = url;
    });
    const scale = computeSafeImageScale(img.naturalWidth, img.naturalHeight, options);
    if (scale >= 0.999) return img;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return img;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await cloneImageElementFromCanvas(canvas);
  } finally {
    URL.revokeObjectURL(url);
    markSpectralForgeImageObjectUrlReleased(url, 'spectral-forge-file-image-url-revoked');
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function computePlacement(
  imageWidth: number,
  imageHeight: number,
  targetWidth: number,
  targetHeight: number,
  options: ImageImportOptions,
) {
  const fitMode = options.fitMode;

  if (fitMode === 'stretch') {
    return { dx: 0, dy: 0, drawWidth: targetWidth, drawHeight: targetHeight };
  }

  const scale = fitMode === 'crop'
    ? Math.max(targetWidth / imageWidth, targetHeight / imageHeight)
    : Math.min(targetWidth / imageWidth, targetHeight / imageHeight);

  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;

  if (fitMode === 'crop') {
    const slackX = Math.max(0, drawWidth - targetWidth);
    const slackY = Math.max(0, drawHeight - targetHeight);
    const shiftX = Math.max(-1, Math.min(1, options.shiftX));
    const shiftY = Math.max(-1, Math.min(1, options.shiftY));
    const dx = -slackX * ((shiftX + 1) * 0.5);
    const dy = -slackY * ((shiftY + 1) * 0.5);
    return { dx, dy, drawWidth, drawHeight };
  }

  const dx = fitMode === 'containRight' ? targetWidth - drawWidth : 0;
  const dy = (targetHeight - drawHeight) * 0.5;
  return { dx, dy, drawWidth, drawHeight };
}

export function renderImageImportPreview(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  options: ImageImportOptions,
  targetWidth: number,
  targetHeight: number,
) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const { dx, dy, drawWidth, drawHeight } = computePlacement(imageWidth, imageHeight, targetWidth, targetHeight, options);
  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
  ctx.restore();
}

function sobelAt(luminance: Float32Array, width: number, height: number, x: number, y: number): number {
  const sample = (sx: number, sy: number) => {
    const xx = Math.max(0, Math.min(width - 1, sx));
    const yy = Math.max(0, Math.min(height - 1, sy));
    return luminance[yy * width + xx] ?? 1;
  };
  const gx =
    -sample(x - 1, y - 1) + sample(x + 1, y - 1)
    - 2 * sample(x - 1, y) + 2 * sample(x + 1, y)
    - sample(x - 1, y + 1) + sample(x + 1, y + 1);
  const gy =
    sample(x - 1, y - 1) + 2 * sample(x, y - 1) + sample(x + 1, y - 1)
    - sample(x - 1, y + 1) - 2 * sample(x, y + 1) - sample(x + 1, y + 1);
  return Math.sqrt(gx * gx + gy * gy) * 0.25;
}

function blurSample(luminance: Float32Array, width: number, height: number, x: number, y: number): number {
  let sum = 0;
  let count = 0;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const xx = Math.max(0, Math.min(width - 1, x + ox));
      const yy = Math.max(0, Math.min(height - 1, y + oy));
      sum += luminance[yy * width + xx] ?? 1;
      count++;
    }
  }
  return count > 0 ? sum / count : 1;
}

export async function importImageElementToSpectralData(
  image: HTMLImageElement,
  spectralData: SpectralData,
  options: ImageImportOptions,
  onProgress?: (progress: number) => void,
): Promise<ImportedImageInfo> {
  const width = spectralData.width;
  const height = spectralData.height;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas-Kontext konnte nicht erzeugt werden');

  onProgress?.(0.08);
  renderImageImportPreview(ctx, image, image.naturalWidth, image.naturalHeight, options, width, height);
  onProgress?.(0.28);

  const imageData = ctx.getImageData(0, 0, width, height);
  const src = imageData.data;
  spectralData.clear();

  const luminance = new Float32Array(width * height);
  const alphaData = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = src[idx] ?? 255;
      const g = src[idx + 1] ?? 255;
      const b = src[idx + 2] ?? 255;
      const a = (src[idx + 3] ?? 255) / 255;
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      luminance[y * width + x] = l;
      alphaData[y * width + x] = a;
    }
  }

  const threshold = options.contrast * 0.55;
  const exponent = 1 + options.contrast * 2.4;
  const edgeBoost = 1 + options.contrast * 1.8;

  for (let y = 0; y < height; y++) {
    const tonalGrain = Math.max(0.18, Math.min(0.92, 0.9 - (y / Math.max(1, height - 1)) * 0.52));
    for (let x = 0; x < width; x++) {
      const dataIndex = y * width + x;
      const l = luminance[dataIndex] ?? 1;
      const a = alphaData[dataIndex] ?? 1;
      const darkness = clamp01((1 - l) * a);
      const blurred = clamp01((1 - blurSample(luminance, width, height, x, y)) * a);
      const edge = clamp01(sobelAt(luminance, width, height, x, y) * a * edgeBoost);

      let amp = 0;
      if (options.readMode === 'legacy') {
        if (darkness > threshold) {
          amp = (darkness - threshold) / Math.max(1e-6, 1 - threshold);
          amp = Math.pow(clamp01(amp), exponent);
        }
      } else if (options.readMode === 'contour') {
        const contour = Math.max(0, edge - threshold * 0.55);
        amp = Math.pow(clamp01(contour), 0.72 + (1 - options.contrast) * 0.35);
        amp *= 0.82 + darkness * 0.28;
      } else {
        const legacy = darkness > threshold
          ? Math.pow(clamp01((darkness - threshold) / Math.max(1e-6, 1 - threshold)), exponent)
          : 0;
        const contour = Math.pow(clamp01(Math.max(0, edge - threshold * 0.4)), 0.8);
        const mass = Math.pow(clamp01(Math.max(0, blurred - threshold * 0.8)), 1.1);
        amp = clamp01(legacy * 0.55 + contour * 0.65 + mass * 0.35);
      }

      spectralData.data[dataIndex] = amp;
      if (amp > 0.001) {
        const contourBias = options.readMode === 'contour' ? 0.18 : options.readMode === 'hybrid' ? 0.08 : 0;
        spectralData.grainData[dataIndex] = clamp01(tonalGrain - edge * contourBias + blurred * 0.08);
      } else {
        spectralData.grainData[dataIndex] = 0.5;
      }
    }
    if (y % 24 === 0) {
      onProgress?.(0.28 + 0.72 * (y / Math.max(1, height - 1)));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress?.(1);
  return {
    imageWidth: image.naturalWidth,
    imageHeight: image.naturalHeight,
    fitMode: options.fitMode,
    contrast: options.contrast,
    readMode: options.readMode,
  };
}
