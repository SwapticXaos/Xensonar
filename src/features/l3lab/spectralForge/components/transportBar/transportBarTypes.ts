import type {
  AudioImportReadMode,
  AudioSourceAsset,
} from "../../audio/AudioImporter";
import type {
  ImageImportFitMode,
  ImageImportReadMode,
} from "../../audio/ImageImporter";

export const HARD_IMAGE_CONTRAST = 0.86;

export interface PendingImageImport {
  file: File;
  image: HTMLImageElement;
  fitMode: ImageImportFitMode;
  shiftX: number;
  shiftY: number;
  contrast: number;
  hardContrast: boolean;
  readMode: ImageImportReadMode;
}

export interface PendingAudioImport {
  file: File;
  source: AudioSourceAsset;
  startSec: number;
  readMode: AudioImportReadMode;
}
