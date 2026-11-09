import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error(`[audio-paint-fretless-field-contract-5126] FAIL: ${message}`);
    process.exit(1);
  }
}

const domain = read('src/features/l3lab/canonicalForge/loopDrumDomain.ts');
const domainTypes = read('src/features/l3lab/canonicalForge/loopDrumDomainTypes.ts');
const sessionTypes = read('src/features/l3lab/canonicalForge/sessionTypes.ts');
const bridge = read('src/features/l3lab/canonicalForge/carrierIntegralPinkLaneBridge.ts');
const preview = read('src/features/l3lab/canonicalForge/loopPreview.ts');

assert(domainTypes.includes('localField?: LocalFieldModuleState | null'), 'CarrierIntegralFieldVoiceEvent must retain localField for glissando/vibrato per voice');
assert(domainTypes.includes('trackVolume?: number'), 'CarrierIntegralFieldVoiceEvent must retain source trackVolume for Root-Follow gain parity');
assert(domainTypes.includes('sourceLineHz?: number | null'), 'CarrierIntegralFieldVoiceEvent must retain sourceLineHz provenance');
assert(domainTypes.includes('spectralWindowMeta?: RootFollowSpectralWindowMeta | null'), 'CarrierIntegralFieldVoiceEvent must retain spectralWindowMeta for later window/granular parity');
assert(sessionTypes.includes('localField?: LocalFieldModuleState | null'), 'Canonical session type mirror must retain localField');
assert(sessionTypes.includes('trackVolume?: number'), 'Canonical session type mirror must retain trackVolume');

assert(bridge.includes('localField: note.localField ?? null'), 'Fretless last-hearing clip must copy note.localField, not collapse to static pitch');
assert(bridge.includes('spectralWindowMeta: note.spectralWindowMeta ?? null'), 'Fretless last-hearing clip must copy spectralWindowMeta');
assert(bridge.includes('trackVolume: Math.max'), 'Field clip must copy source track volume');
assert(bridge.includes('sourceLineHz:'), 'Field clip must retain source line Hz provenance');
assert(bridge.includes("label: 'Fretless-Feld'"), 'UI description must name last-hearing as Fretless-Feld');
assert(bridge.includes("label: 'Raw Audio'") && bridge.includes('gerenderter Carrier-Klangkörper als Audiomaterial'), 'grained variant must truthfully describe the rendered Carrier body as Raw Audio material');

assert(preview.includes('buildCarrierFieldVoicePitchCurve'), 'Preview must combine clip and per-voice pitch curves for field voices');
assert(preview.includes('voiceLocalField'), 'Preview must use voice-local field, not only clip-level localField');
assert(preview.includes('scheduleDynamicFieldGainAutomation(voiceDynamicGain, [voice.localField ?? null]'), 'Preview must use voice-local dynamic fields per internal Carrier voice');
assert(preview.includes('const isCarrierIntegralFieldClip'), 'Preview must detect Carrier field clips before applying standard outer note gain');
assert(preview.includes('const peak = isCarrierIntegralFieldClip ? 1'), 'Carrier field clips must bypass the normal outer mono-note gain envelope');
assert(preview.includes('sourceTrackVolume') && preview.includes('* sourceTrackVolume * clipGlobalVolume * 0.42'), 'Field voice gain must follow Root-Follow-like source-track gain parity');
assert(!preview.includes('Number(osc.gain) * outputGain'), 'Pink preview must not multiply already-baked carrier timbre outputGain twice');
assert(!preview.includes('const outputGain = Math.max(0.05'), 'Pink preview must not keep unused/double outputGain scalar');

const applyBody = bridge.slice(bridge.indexOf('export function applyCarrierIntegralPinkLaneToDraft'));
const lastHearingBranch = applyBody.slice(applyBody.indexOf("if (variant === 'monotone')"), applyBody.indexOf('nextNotes = [syncLoopNoteToState'));
assert(lastHearingBranch.includes('buildCarrierIntegralFieldClip'), 'last-hearing must use field clip builder');
assert(!lastHearingBranch.includes('resolveMaterialAnchor'), 'last-hearing must not raster-project individual voices');
assert(!lastHearingBranch.includes('applyScatteredProjection'), 'last-hearing must not use scattered/raster projection');

console.log('[audio-paint-fretless-field-contract-5126] OK');
