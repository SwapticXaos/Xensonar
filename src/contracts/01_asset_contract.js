/* XenSonar P1: control-plane-only, versioned descriptors for interchangeable
 * musical audio assets. There is NO import, IO, Blob copy, PCM copy, event bus,
 * new AudioNode, Worker or AudioWorklet here. Do not call in a note trigger.
 *
 * The descriptor is deliberately smaller than an archive: repositories own
 * bytes, adapters own conversions, recipients own musical interpretation.
 */
const __XenDataContractsV1 = (() => {
  const format = 'xensonar.asset', schemaVersion = 1;
  const kinds = new Set(['audio/pcm', 'audio/wav']);
  const fail = message => { throw new TypeError('XenSonar data contract: ' + message); };
  const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const ref = id => id == null || (typeof id === 'string' &&
    ((id.startsWith('asset:') && id.length > 6 && id.length <= 512 &&
      !/[\u0000-\u001f\u007f]/.test(id)) ||
     (/^(?:melodic-sample|sample|idb|session):[A-Za-z0-9_.:/-]{1,480}$/.test(id) &&
      !id.split('/').includes('..'))));
  const producer = source => typeof source === 'string' &&
    /^[a-z][a-z0-9-]{0,79}$/.test(source);
  function freezeDescriptor(kind, source, audio, payload) {
    return Object.freeze({format,schemaVersion,kind,
      source:Object.freeze({producer:source}),
      audio:Object.freeze(audio),payload:Object.freeze(payload)});
  }
  function validate(d, {kind} = {}) {
    if (!plain(d) || d.format !== format) fail('unknown asset format');
    if (d.schemaVersion !== schemaVersion) fail('unsupported schema version');
    if (!kinds.has(d.kind) || (kind && d.kind !== kind)) fail('unexpected asset kind');
    if (!plain(d.source) || !producer(d.source.producer)) fail('invalid producer');
    if (!plain(d.audio) || !plain(d.payload)) fail('missing audio / payload description');
    if (!ref(d.payload.assetRef)) fail('invalid asset reference');
    if (d.kind === 'audio/pcm') {
      if (!Number.isInteger(d.audio.sampleRate) || d.audio.sampleRate < 1000 || d.audio.sampleRate > 768000)
        fail('invalid PCM sample rate');
      if (!Number.isSafeInteger(d.audio.frames) || d.audio.frames < 1 ||
          !Number.isInteger(d.audio.channelCount) || d.audio.channelCount < 1 || d.audio.channelCount > 32 ||
          d.audio.encoding !== 'f32-planar') fail('invalid PCM dimensions/encoding');
      if (d.payload.storage !== 'borrowed-pcm') fail('invalid PCM storage');
    } else {
      if (d.payload.mime !== 'audio/wav' || !Number.isSafeInteger(d.payload.byteLength) ||
          d.payload.byteLength <= 44 || d.payload.storage !== 'borrowed-blob')
        fail('invalid or empty WAV asset');
    }
    return d;
  }
  function describeLegacyPCM(asset, {producer:origin,assetId=null} = {}) {
    if (!producer(origin)) fail('invalid producer');
    if (!ref(assetId)) fail('invalid asset reference');
    const sampleRate = Number(asset?.sampleRate);
    const channels = [asset?.monoSamples,asset?.leftSamples,asset?.rightSamples]
      .filter(p => p instanceof Float32Array && p.length > 0);
    if (!channels.length) fail('PCM samples missing');
    // Legacy mono/left/right are views of one source, not three simultaneous channels.
    const frames = channels[0].length;
    if (channels.some(p => p.length !== frames)) fail('PCM channel length mismatch');
    const stereo = asset?.channelCount >= 2 && asset?.rightSamples instanceof Float32Array && asset.rightSamples.length === frames;
    return validate(freezeDescriptor('audio/pcm',origin,
      {sampleRate,frames,channelCount:stereo?2:1,encoding:'f32-planar'},
      {storage:'borrowed-pcm',assetRef:assetId}));
  }
  function describeWavBlob(blob, {producer:origin,assetId=null} = {}) {
    if (!producer(origin)) fail('invalid producer');
    if (!ref(assetId)) fail('invalid asset reference');
    if (!blob || !Number.isSafeInteger(blob.size) || blob.size <= 44 ||
        (blob.type && !['audio/wav','audio/x-wav','audio/wave'].includes(blob.type))) fail('invalid or empty WAV blob');
    return validate(freezeDescriptor('audio/wav',origin,{},
      {storage:'borrowed-blob',assetRef:assetId,mime:'audio/wav',byteLength:blob.size}));
  }
  function attach(target, description) {
    if (!plain(target)) fail('invalid transfer/state object');
    // The adapter is intentionally invisible to legacy JSON persistence and
    // Object.assign/spreads. New transport adapters opt in via `.xenData`.
    Object.defineProperty(target,'xenData',{value:description,configurable:true,enumerable:false});
    return target;
  }
  function bindWavTransfer(transfer, options) {
    return attach(transfer,describeWavBlob(transfer?.blob,options));
  }
  function bindPCMState(state, pcm, options) {
    return attach(state,describeLegacyPCM(pcm,options));
  }
  function forwardWav(transfer) {
    const description = transfer?.xenData;
    if (!description) fail('missing WAV transfer contract at gateway');
    validate(description,{kind:'audio/wav'});
    if (!transfer?.blob || transfer.blob.size !== description.payload.byteLength)
      fail('WAV transfer payload/contract mismatch');
    return transfer.blob;
  }
  return Object.freeze({format,schemaVersion,validate,describeLegacyPCM,describeWavBlob,
    bindWavTransfer,bindPCMState,forwardWav});
})();
