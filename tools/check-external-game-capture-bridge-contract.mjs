#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const files = {
  globalBridge: 'src/features/xensonar/audio/globalRecordingCaptureBridge.ts',
  liveMaster: 'src/features/xensonar/audio/liveMasterBusRuntimeBoundary.ts',
  refs: 'src/features/xensonar/audio/useLiveMasterBusRuntimeRefs.ts',
  app: 'src/App.tsx',
  iframeBridge: 'src/features/xensonar/family/capture/standaloneIframeAudioCaptureBridge.ts',
  mainRoom: 'src/features/xensonar/rooms/MainRoom.tsx',
  xenpolarRoom: 'src/features/xensonar/rooms/XenpolarRoom.tsx',
};

const read = (path) => readFileSync(path, 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    console.error(`[check-external-game-capture-bridge-contract] FAIL: ${message}`);
    process.exit(1);
  }
};

const bridge = read(files.globalBridge);
assert(bridge.includes('registerExternalAudioCapture?:'), 'shared audio bridge must expose external capture registration');
assert(bridge.includes('registerXensonarExternalAudioCapture'), 'global helper must route standalone iframe streams to active bridge');
assert(bridge.includes('registerExternalAudioPcmCapture?:'), 'shared audio bridge must expose fallback PCM capture registration');
assert(bridge.includes('registerXensonarExternalAudioPcmCapture'), 'global helper must route standalone iframe PCM blocks to active bridge');
assert(bridge.includes('activeBridgeGeneration') && bridge.includes('readXensonarSharedAudioOutputBridgeGeneration'), 'global bridge must expose a generation counter so iframe PCM handles can survive parent bridge re-registration');

const liveMaster = read(files.liveMaster);
assert(liveMaster.includes('externalGameRecordingBusRef'), 'live master refs must carry an external-game recording bus');
assert(liveMaster.includes('ensureExternalGameRecordingCaptureBusRuntime'), 'live master must expose capture-only bus runtime');
assert(liveMaster.includes('recording:external-game-capture->media-destination'), 'external-game bus must feed MediaRecorder destinations, not speaker destination');
assert(!/externalGameRecordingBusRef[\s\S]{0,120}ctx\.destination/.test(liveMaster), 'external-game bus must not be connected directly to speakers');

const refs = read(files.refs);
assert(refs.includes('useRef<GainNode | null>(null)'), 'runtime refs must allocate GainNode ref for capture bus');
assert(refs.includes('externalGameRecordingBusConnectionTargetsRef'), 'runtime refs must track capture-bus destination connections');

const app = read(files.app);
assert(app.includes('registerExternalAudioCapture:'), 'App bridge must register external game capture streams');
assert(app.includes('ctx.createMediaStreamSource(stream)'), 'App bridge must convert iframe MediaStream into parent AudioContext source');
assert(app.includes('ensureExternalGameRecordingCaptureBus(ctx)'), 'App bridge must connect iframe streams to capture-only recording bus');
assert(app.includes('registerExternalAudioPcmCapture:'), 'App bridge must register fallback PCM capture streams');
assert(app.includes('ctx.createScriptProcessor(1024, 0, 2)'), 'Parent bridge must synthesize fallback PCM blocks into a capture-only WebAudio node');
assert(app.includes('resamplePcmChannel'), 'Parent bridge must handle sample-rate mismatch for iframe PCM fallback');

const iframeBridge = read(files.iframeBridge);
assert(iframeBridge.includes('__xensonar_standalone_iframe_audio_capture__'), 'iframe bridge must use a dedicated postMessage channel');
assert(iframeBridge.includes('AudioNode') && iframeBridge.includes('patchedConnect'), 'iframe bridge must mirror AudioNode destination connections');
assert(iframeBridge.includes('createMediaStreamDestination'), 'iframe bridge must create child-context MediaStreamDestination taps');
assert(iframeBridge.includes('__xensonarStandaloneIframeAudioCaptureStreams'), 'iframe bridge must expose same-origin fallback streams for srcDoc frames');
assert(iframeBridge.includes("type: 'pcm'") && iframeBridge.includes('createScriptProcessor(1024, 2, 2)'), 'iframe bridge must include PCM fallback when MediaStream crossing is unavailable');
assert(iframeBridge.includes('postPcmBlock') && iframeBridge.includes('copyFromChannel'), 'iframe bridge must post copied Float32 PCM blocks to parent');
assert(iframeBridge.includes('readXensonarSharedAudioOutputBridgeGeneration'), 'iframe PCM host must recreate handles when the parent bridge generation changes');
assert(iframeBridge.includes('silentSink.gain.value = 0.000001'), 'iframe PCM tap must use a non-zero inaudible sink so browsers do not stop pulling the ScriptProcessor branch');
assert(iframeBridge.includes('__xensonarStandaloneIframeAudioCaptureProbe'), 'iframe bridge must expose a console-visible capture probe for red/green browser findings');
assert(iframeBridge.includes('internalPcmSinkConnecting') && iframeBridge.includes('!internalPcmSinkConnecting && ctx && destination === ctx.destination'), 'iframe PCM silent sink must not be mirrored back into the PCM tap');

const mainRoom = read(files.mainRoom);
assert(mainRoom.includes('injectStandaloneIframeAudioCaptureBridge'), 'Family iframe HTML must be injected with capture bridge');
assert(mainRoom.includes('useStandaloneIframeAudioCapture'), 'Family iframe host must listen for capture streams');
assert(mainRoom.includes('captureKey={`family-${active}`}'), 'Family iframes must use stable capture keys');

const xenpolarRoom = read(files.xenpolarRoom);
assert(xenpolarRoom.includes('injectStandaloneIframeAudioCaptureBridge'), 'Xenpolar standalone HTML must be injected with capture bridge');
assert(xenpolarRoom.includes('captureKey={`xenpolar-${view}`}'), 'Xenpolar iframes must use stable capture keys');

console.log('[check-external-game-capture-bridge-contract] PASS');
