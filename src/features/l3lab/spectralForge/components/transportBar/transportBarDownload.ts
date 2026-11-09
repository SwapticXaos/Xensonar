import {
  markSpectralForgeDownloadObjectUrlReleased,
  registerSpectralForgeDownloadObjectUrl,
} from "../../lifecycle/spectralForgePreviewLifecycleRegistry";

export function sanitizeName(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "spectral-material"
  );
}

export function triggerSpectralForgeDownloadUrl(
  blob: Blob,
  fileName: string,
  owner: string,
) {
  const url = URL.createObjectURL(blob);
  registerSpectralForgeDownloadObjectUrl(url, blob, fileName, owner);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  markSpectralForgeDownloadObjectUrlReleased(
    url,
    "spectral-forge-transport-download-url-revoked",
  );
}
