/* TS-MOD-05: Workspace package envelope validation, FNV-1a content hashing, chunked Base64 binary
   encoding/decoding, and JSON download helpers, brought back from
   src/runtime/instrument/04_performance_and_output_profiles.js into strict TypeScript.
   Built by tools/ts_module.cjs into __XenTs_workspacePackageCodec.
   Zone: COLD (offline workspace import/export, snapshots, stamp/package serialization). */

export interface WorkspacePackageSection {
  readonly kind?: unknown;
  readonly payload?: unknown;
}

export interface WorkspacePackageValidateInput {
  readonly parsed: unknown;
  readonly expectedFormat: string;
  readonly expectedVersion: number | string;
  readonly fallbackLabel: string;
  readonly fallbackPackageId?: string;
}

export interface WorkspacePackageEnvelope {
  readonly format: string;
  readonly version: number | string;
  readonly packageId: string;
  readonly exportedAt: number;
  readonly label: string;
  readonly warnings: string[];
}

export interface WorkspaceFilenameOptions {
  readonly prefix?: string;
  readonly createdAt?: Date | number;
}

export interface WorkspaceJsonDownload {
  readonly url: string;
  readonly filename: string;
  readonly byteLength: number;
  readonly createdAt: number;
  readonly label: string;
  readonly prefix: string;
}

export const WORKSPACE_PACKAGE_DEFAULT_TITLE = 'Xensonar Tüftelpaket';

export function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function findPackageSectionPayload(pkg: unknown, kind: string): unknown {
  if (!isRecordObject(pkg) || !Array.isArray(pkg.sections)) return null;
  for (const section of pkg.sections as WorkspacePackageSection[]) {
    if (!isRecordObject(section) || section.kind !== kind) continue;
    return section.payload ?? null;
  }
  return null;
}

export function createPackageId(prefix = 'pkg'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function hashStringFnv1a(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export function stringifyPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function validateWorkspacePackageEnvelope(
  input: WorkspacePackageValidateInput,
): WorkspacePackageEnvelope {
  const { parsed, expectedFormat, expectedVersion, fallbackLabel } = input;
  if (!isRecordObject(parsed) || parsed.format !== expectedFormat || parsed.version !== expectedVersion) {
    throw new Error(`Not a valid ${fallbackLabel} package.`);
  }
  return {
    format: expectedFormat,
    version: expectedVersion,
    packageId:
      typeof parsed.packageId === 'string'
        ? parsed.packageId
        : (input.fallbackPackageId ?? createPackageId()),
    exportedAt: typeof parsed.exportedAt === 'number' ? parsed.exportedAt : Date.now(),
    label: typeof parsed.label === 'string' ? parsed.label : fallbackLabel,
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((item): item is string => typeof item === 'string')
      : [],
  };
}

export function encodeArrayBufferToBase64Chunks(
  buffer: ArrayBufferLike,
  chunkBytes = 393216,
): string[] {
  const bytes = new Uint8Array(buffer);
  const alignedChunk = Math.max(3, Math.floor(chunkBytes / 3) * 3);
  const parts: string[] = [];
  const subChunk = 32768;
  for (let offset = 0; offset < bytes.length; offset += alignedChunk) {
    const end = Math.min(bytes.length, offset + alignedChunk);
    let binary = '';
    for (let pos = offset; pos < end; pos += subChunk) {
      const slice = bytes.subarray(pos, Math.min(end, pos + subChunk));
      binary += String.fromCharCode(...slice);
    }
    parts.push(globalThis.btoa(binary));
  }
  return parts;
}

export function encodeArrayBufferToBase64(buffer: ArrayBufferLike): string {
  return encodeArrayBufferToBase64Chunks(buffer).join('');
}

export function decodeBase64ToBlob(base64: string, mimeType?: string): Blob {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}

export function slugifyPackageLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'workspace';
}

export function formatWorkspacePackageFilename(
  label: string,
  options?: WorkspaceFilenameOptions,
): string {
  const slug = slugifyPackageLabel(label);
  const prefix = options?.prefix?.trim() || 'xensonar';
  const created =
    options?.createdAt instanceof Date
      ? options.createdAt
      : new Date(typeof options?.createdAt === 'number' ? options.createdAt : Date.now());
  return `${prefix}-${slug}-${created.toISOString().replace(/[:.]/g, '-')}.json`;
}

export function formatPackageFilenameFromMeta(
  meta: WorkspaceFilenameOptions,
  label: string,
): string {
  return formatWorkspacePackageFilename(label, {
    prefix: meta.prefix,
    createdAt: meta.createdAt,
  });
}

export function createJsonBlobDownload(
  parts: BlobPart[],
  label: string,
  options?: Pick<WorkspaceFilenameOptions, 'prefix'>,
): WorkspaceJsonDownload {
  const prefix = options?.prefix?.trim() || 'xensonar';
  const blob = new Blob(parts, { type: 'application/json' });
  return {
    url: URL.createObjectURL(blob),
    filename: formatWorkspacePackageFilename(label, { prefix }),
    byteLength: blob.size,
    createdAt: Date.now(),
    label,
    prefix,
  };
}

export function createSingleJsonBlobDownload(
  jsonText: string,
  label: string,
  options?: Pick<WorkspaceFilenameOptions, 'prefix'>,
): WorkspaceJsonDownload {
  return createJsonBlobDownload([jsonText], label, options);
}

export function revokeDownloadUrl(download: Pick<WorkspaceJsonDownload, 'url'> | null | undefined): void {
  if (download?.url) URL.revokeObjectURL(download.url);
}

export function triggerJsonDownload(
  jsonText: string,
  label: string,
  options?: Pick<WorkspaceFilenameOptions, 'prefix'>,
): void {
  const download = createSingleJsonBlobDownload(jsonText, label, options);
  const link = document.createElement('a');
  link.href = download.url;
  link.download = download.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => revokeDownloadUrl(download), 1200);
}
