export type WorkspacePackageImportMode = 'merge' | 'replace' | 'differential';

export type SystemMemoryPackageDomain =
  | 'melodic-workspace'
  | 'grid-library'
  | 'drum-library'
  | 'material-library';

export type JsonPackageMeta<Format extends string = string, Version extends number = number> = {
  format: Format;
  version: Version;
  packageId: string;
  exportedAt: number;
  label: string;
  warnings: string[];
};


export type JsonPackageSection<Kind extends string = string, Payload = unknown> = {
  kind: Kind;
  payload: Payload;
  summary?: string;
  warnings?: string[];
};

export function buildJsonPackageSection<Kind extends string, Payload>(
  kind: Kind,
  payload: Payload,
  options?: { summary?: string; warnings?: string[] },
): JsonPackageSection<Kind, Payload> {
  return {
    kind,
    payload,
    summary: options?.summary,
    warnings: options?.warnings,
  };
}

export function readJsonPackageSectionPayload<Kind extends string>(
  parsed: unknown,
  kind: Kind,
): unknown {
  if (!isRecord(parsed) || !Array.isArray(parsed.sections)) return null;
  for (const section of parsed.sections) {
    if (!isRecord(section) || section.kind !== kind) continue;
    return (section as Record<string, unknown>).payload ?? null;
  }
  return null;
}

export function buildJsonPackageId(prefix = 'pkg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function hashStableString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function serializeJsonPackage<T>(pkg: T) {
  return JSON.stringify(pkg, null, 2);
}

export function parseJsonPackageMeta<Format extends string, Version extends number>(args: {
  parsed: unknown;
  expectedFormat: Format;
  expectedVersion: Version;
  fallbackLabel: string;
  fallbackPackageId?: string;
}): JsonPackageMeta<Format, Version> {
  const { parsed, expectedFormat, expectedVersion, fallbackLabel } = args;
  if (!isRecord(parsed) || parsed.format !== expectedFormat || parsed.version !== expectedVersion) {
    throw new Error(`Kein gueltiges ${fallbackLabel}-Paket.`);
  }
  return {
    format: expectedFormat,
    version: expectedVersion,
    packageId: typeof parsed.packageId === 'string' ? parsed.packageId : (args.fallbackPackageId ?? buildJsonPackageId()),
    exportedAt: typeof parsed.exportedAt === 'number' ? parsed.exportedAt : Date.now(),
    label: typeof parsed.label === 'string' ? parsed.label : fallbackLabel,
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((entry): entry is string => typeof entry === 'string')
      : [],
  };
}

export function arrayBufferToBase64Chunks(arrayBuffer: ArrayBuffer, chunkBytes = 0x60000) {
  const bytes = new Uint8Array(arrayBuffer);
  const rawChunk = Math.max(3, Math.floor(chunkBytes / 3) * 3);
  const parts: string[] = [];
  const subChunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += rawChunk) {
    const end = Math.min(bytes.length, index + rawChunk);
    let binary = '';
    for (let offset = index; offset < end; offset += subChunkSize) {
      const chunk = bytes.subarray(offset, Math.min(end, offset + subChunkSize));
      binary += String.fromCharCode(...chunk);
    }
    parts.push(window.btoa(binary));
  }
  return parts;
}

export function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  return arrayBufferToBase64Chunks(arrayBuffer).join('');
}

export function base64ToBlob(base64: string, mimeType: string) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}

function sanitizePackageLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'workspace';
}

export type PreparedJsonPackageDownload = {
  url: string;
  filename: string;
  byteLength: number;
  createdAt: number;
  label: string;
  prefix: string;
};

export function buildJsonPackageFilename(label: string, options?: { prefix?: string; createdAt?: number | Date }) {
  const safe = sanitizePackageLabel(label);
  const prefix = options?.prefix?.trim() || 'xensonar';
  const createdAt = options?.createdAt instanceof Date
    ? options.createdAt
    : new Date(typeof options?.createdAt === 'number' ? options.createdAt : Date.now());
  return `${prefix}-${safe}-${createdAt.toISOString().replace(/[:.]/g, '-')}.json`;
}

export function buildPreparedJsonPackageDownloadAliasFilename(download: PreparedJsonPackageDownload, label: string) {
  return buildJsonPackageFilename(label, { prefix: download.prefix, createdAt: download.createdAt });
}

export function prepareJsonPackageDownloadFromBlobParts(parts: BlobPart[], label: string, options?: { prefix?: string }): PreparedJsonPackageDownload {
  const prefix = options?.prefix?.trim() || 'xensonar';
  const blob = new Blob(parts, { type: 'application/json' });
  return {
    url: URL.createObjectURL(blob),
    filename: buildJsonPackageFilename(label, { prefix }),
    byteLength: blob.size,
    createdAt: Date.now(),
    label,
    prefix,
  };
}

export function prepareJsonPackageDownload(json: string, label: string, options?: { prefix?: string }): PreparedJsonPackageDownload {
  return prepareJsonPackageDownloadFromBlobParts([json], label, options);
}

export function revokePreparedJsonPackageDownload(download: PreparedJsonPackageDownload | null | undefined) {
  if (!download?.url) return;
  URL.revokeObjectURL(download.url);
}

export function downloadJsonPackage(json: string, label: string, options?: { prefix?: string }) {
  const prepared = prepareJsonPackageDownload(json, label, options);
  const anchor = document.createElement('a');
  anchor.href = prepared.url;
  anchor.download = prepared.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => revokePreparedJsonPackageDownload(prepared), 1200);
}
