export type EmbeddedStandaloneAppKey = 'resonanzwerk' | 'zone' | 'strangeAttractors' | 'melodieQuest';

export const EMBEDDED_STANDALONE_APP_ASSET_VERSION = '3.2.91.5.44-family-standalone-externalized-v1' as const;

export const EMBEDDED_STANDALONE_APP_KEYS: readonly EmbeddedStandaloneAppKey[] = [
  'resonanzwerk',
  'zone',
  'strangeAttractors',
  'melodieQuest',
] as const;

export const EMBEDDED_STANDALONE_APP_ASSET_BASE = './xensonar-family-standalone' as const;

export const EMBEDDED_STANDALONE_APP_ASSET_FILENAMES: Record<EmbeddedStandaloneAppKey, string> = {
  resonanzwerk: 'resonanzwerk.html.gz.b64',
  zone: 'zone.html.gz.b64',
  strangeAttractors: 'strangeAttractors.html.gz.b64',
  melodieQuest: 'melodieQuest.html.gz.b64',
};

type EmbeddedStandalonePayloadMap = Partial<Record<EmbeddedStandaloneAppKey, string>>;

declare global {
  interface Window {
    __XENSONAR_EMBEDDED_STANDALONE_APPS__?: EmbeddedStandalonePayloadMap;
    __XENSONAR_STANDALONE_APP_ASSET_BASE__?: string;
  }
}

const htmlCache = new Map<EmbeddedStandaloneAppKey, Promise<string>>();
const payloadCache = new Map<EmbeddedStandaloneAppKey, Promise<string>>();

function normalizeAssetBase(base: string): string {
  return base.replace(/\/+$/, '');
}

function getStandaloneAssetBase(): string {
  if (typeof window === 'undefined') return EMBEDDED_STANDALONE_APP_ASSET_BASE;
  const override = window.__XENSONAR_STANDALONE_APP_ASSET_BASE__;
  if (typeof override === 'string' && override.trim().length > 0) return normalizeAssetBase(override.trim());
  return EMBEDDED_STANDALONE_APP_ASSET_BASE;
}

export function getEmbeddedStandaloneAppAssetUrl(key: EmbeddedStandaloneAppKey): string {
  return `${getStandaloneAssetBase()}/${EMBEDDED_STANDALONE_APP_ASSET_FILENAMES[key]}`;
}

function decodeBase64(base64: string): Uint8Array {
  const normalized = base64.replace(/\s+/g, '');
  const binary = window.atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function gunzipToText(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Embedded standalone apps need DecompressionStream support in this browser.');
  }
  const blobPart = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const decompressedStream = new Blob([blobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(decompressedStream).arrayBuffer();
  return new TextDecoder().decode(buffer);
}

async function loadEmbeddedStandalonePayload(key: EmbeddedStandaloneAppKey): Promise<string> {
  const inlinePayload = window.__XENSONAR_EMBEDDED_STANDALONE_APPS__?.[key];
  if (typeof inlinePayload === 'string' && inlinePayload.trim().length > 0) return inlinePayload;

  const response = await fetch(getEmbeddedStandaloneAppAssetUrl(key), { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Embedded standalone app asset ${key} could not be loaded (${response.status}).`);
  }
  return response.text();
}

export function loadEmbeddedStandaloneHtml(key: EmbeddedStandaloneAppKey): Promise<string> {
  const cachedHtml = htmlCache.get(key);
  if (cachedHtml) return cachedHtml;

  const cachedPayload = payloadCache.get(key) ?? loadEmbeddedStandalonePayload(key);
  payloadCache.set(key, cachedPayload);

  const promise = cachedPayload.then((payload) => gunzipToText(decodeBase64(payload)));
  htmlCache.set(key, promise);
  return promise;
}
