import { parseAndValidateHarmonicWorldExport, serializeHarmonicWorldExport, type HarmonicWorldExport } from "./harmonicWorld";

const HASH_PREFIX = "#world=";

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(b64url: string): string | null {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function buildWorldShareUrl(exportData: HarmonicWorldExport, baseUrl: string): string {
  const json = serializeHarmonicWorldExport(exportData, false);
  const payload = base64UrlEncode(json);
  return `${baseUrl}${HASH_PREFIX}${payload}`;
}

export type ConsumeWorldShareHashResult =
  | { ok: true; data: HarmonicWorldExport }
  | { ok: false; error: string };

/**
 * If the URL hash contains "#world=<payload>", decode/validate and return the world.
 * This does not mutate history; callers can clear the hash if they want one-shot import behavior.
 */
export function consumeWorldShareHash(hash: string): ConsumeWorldShareHashResult {
  if (!hash || !hash.startsWith(HASH_PREFIX)) return { ok: false, error: "No shared world" };
  const payload = hash.slice(HASH_PREFIX.length).trim();
  if (!payload) return { ok: false, error: "Empty shared world" };
  const json = base64UrlDecode(payload);
  if (!json) return { ok: false, error: "Invalid share payload" };
  const parsed = parseAndValidateHarmonicWorldExport(json);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return { ok: true, data: parsed.data };
}

