/** PCM data plane. React only participates in the one-time output handover. */
export const POST_MASTER_PCM_WORKER_SOURCE = String.raw`
let initialized = false, stopping = false, faultSent = false;
let writePtr, readPtr, storage, control, capacity;
let sampleRate, blockFrames, prefillFrames, baseUrl;
let token = '', sessionId = '', generation = 0, sequence = 0, consumedFrames = 0, originFrame = null;
let socket = null, packetBuffer, packetView, packetSamples;
let setupPromise = null, stopPromise = null, commitSent = false, prefilled = false;
let latestNativeFillFrames = 0, latestNativeMinFillFrames = 0, lastProgressMs = 0;
let activateResolve;
const activation = new Promise(resolve => { activateResolve = resolve; });
const waiters = new Map();
const WS_PCM = 1, WS_COMMIT = 2, WS_STOP = 3, WS_BARRIER = 4;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const post = message => self.postMessage({ ...message, generation });
const availableRead = () => (Atomics.load(writePtr, 0) + capacity - Atomics.load(readPtr, 0)) % capacity;
function checkRunning() { if (stopping) throw new Error('output-session-stopped'); }
function checkRing() {
  if (Atomics.load(control, 6)) throw new Error('browser-pcm-ring-overflow');
  // Storage capacity is not permission to grow latency without limit.
  if (availableRead() / 2 > prefillFrames + blockFrames * 2) throw new Error('browser-pcm-backlog');
}
async function getJson(path, init = {}) {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 1200);
  try {
    const response = await fetch(baseUrl + path, { cache: 'no-store', ...init, signal: abort.signal });
    const body = await response.json();
    if (!response.ok) throw new Error(path + '-' + response.status + ':' + String(body.error || ''));
    return body;
  } finally { clearTimeout(timer); }
}
const headers = () => ({ 'X-Xensonar-Token': token, 'X-Xensonar-Session': sessionId,
  'Content-Type': 'application/x-www-form-urlencoded' });
function controlPacket(type) {
  const buffer = new ArrayBuffer(8), view = new DataView(buffer);
  view.setUint32(0, type, true); view.setUint32(4, generation, true);
  return buffer;
}
function waitFor(type, timeout = 1200) {
  if (waiters.has(type)) throw new Error('duplicate-waiter-' + type);
  return new Promise((resolve, reject) => {
    const finish = (error, value) => {
      clearTimeout(timer); waiters.delete(type);
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error(type + '-timeout')), timeout);
    waiters.set(type, { resolve: value => finish(null, value), reject: error => finish(error) });
  });
}
function rejectWaiters(error) { for (const waiter of [...waiters.values()]) waiter.reject(error); }
async function openStream() {
  const wsBase = baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  socket = new WebSocket(wsBase + '/v1/post-master/stream?token=' + encodeURIComponent(token) +
    '&session=' + encodeURIComponent(sessionId) + '&generation=' + generation);
  socket.binaryType = 'arraybuffer';
  const opened = waitFor('OPEN');
  socket.onopen = () => waiters.get('OPEN')?.resolve({});
  socket.onerror = () => {
    const error = new Error('post-master-stream-error');
    rejectWaiters(error); if (!stopping) fail(error);
  };
  socket.onclose = () => {
    const error = new Error('post-master-stream-closed');
    rejectWaiters(error); if (!stopping) fail(error);
  };
  socket.onmessage = event => {
    if (typeof event.data !== 'string') return;
    let message;
    try { message = JSON.parse(event.data); } catch { fail(new Error('invalid-native-message')); return; }
    if (Number(message.generation) !== generation) { fail(new Error('native-generation-mismatch')); return; }
    if (message.type === 'FAULT') {
      const error = new Error(String(message.error || 'native-stream-fault'));
      rejectWaiters(error); if (!stopping) fail(error); return;
    }
    if (message.fillFrames !== undefined) latestNativeFillFrames = Number(message.fillFrames);
    if (message.minFillFrames !== undefined) latestNativeMinFillFrames = Number(message.minFillFrames);
    waiters.get(message.type)?.resolve(message);
  };
  await opened;
}
async function bootstrap() {
  const session = await getJson('/v1/session');
  checkRunning();
  if (session.physicalAudio !== true) throw new Error('physical-audio-not-ready');
  if (session.postMasterProtocol !== 2 || session.postMasterExclusive !== true) throw new Error('exclusive-post-master-host-v2-required');
  if (Number(session.sampleRate) !== sampleRate) throw new Error('post-master-sample-rate-mismatch');
  token = String(session.token || ''); sessionId = String(session.sessionId || '');
  if (!token || !sessionId) throw new Error('session-identity-missing');
  const begin = await getJson('/v1/post-master/begin', { method: 'POST', headers: headers(),
    body: 'sampleRate=' + sampleRate + '&channels=2&prefillFrames=' + prefillFrames });
  generation = Number(begin.generation) >>> 0;
  if (!generation) throw new Error('native-generation-missing');
  checkRunning();
  await openStream();
  checkRunning();
  Atomics.store(control, 9, 1); // Start capture only after the transport is ready.
  post({ type: 'ARMED' });
}
function sendBlock() {
  if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('post-master-stream-not-open');
  // Fail a blocked delivery path instead of queueing an ever older performance.
  if (socket.bufferedAmount > 4 * packetBuffer.byteLength) throw new Error('post-master-socket-backlog');
  const count = blockFrames * 2, rd = Atomics.load(readPtr, 0);
  if (availableRead() < count) return false;
  const first = Math.min(capacity - rd, count);
  packetSamples.set(storage.subarray(rd, rd + first));
  if (first < count) packetSamples.set(storage.subarray(0, count - first), first);
  if (originFrame === null) originFrame = (Atomics.load(control, 1) >>> 0) * 4294967296 + (Atomics.load(control, 0) >>> 0);
  packetView.setUint32(0, WS_PCM, true); packetView.setUint32(4, generation, true);
  packetView.setBigUint64(8, BigInt(sequence), true);
  packetView.setBigUint64(16, BigInt(originFrame + consumedFrames), true);
  packetView.setUint32(24, blockFrames, true); packetView.setUint32(28, sampleRate, true);
  socket.send(packetBuffer);
  Atomics.store(readPtr, 0, (rd + count) % capacity);
  consumedFrames += blockFrames; sequence++;
  return true;
}
async function fill() {
  while (!stopping && consumedFrames < prefillFrames) {
    checkRing();
    if (Atomics.load(control, 2) && sendBlock()) continue;
    await sleep(1);
  }
  checkRunning();
  const barrier = waitFor('BARRIER');
  socket.send(controlPacket(WS_BARRIER));
  const ready = await barrier;
  if (ready.fault || Number(ready.fillFrames) < prefillFrames) throw new Error('native-prefill-not-established');
  if (Atomics.load(control, 8)) throw new Error('select-master-output-before-playing');
  prefilled = true;
  post({ type: 'PREFILLED', fillFrames: Number(ready.fillFrames) });
}
async function pump() {
  await setupPromise;
  await fill();
  // No native output before the browser confirms its master edge is disconnected.
  const activate = await activation;
  if (!activate || stopping) return;
  checkRing();
  if (Atomics.load(control, 8)) throw new Error('select-master-output-before-playing');
  Atomics.store(control, 10, 1);
  const committed = waitFor('COMMITTED');
  // Attach the rejection handler immediately. Do not await ACK on the PCM path.
  void committed.then(message => { if (!stopping) post({ type: 'COMMITTED', fillFrames: message.fillFrames }); }, fail);
  commitSent = true;
  socket.send(controlPacket(WS_COMMIT));
  while (!stopping) {
    checkRing();
    if (!sendBlock()) { await sleep(1); continue; }
    const now = performance.now();
    if (now - lastProgressMs >= 900) {
      lastProgressMs = now;
      post({ type: 'PROGRESS', browserRingFrames: availableRead() / 2,
        nativeFillFrames: latestNativeFillFrames, nativeMinFillFrames: latestNativeMinFillFrames,
        sequence, consumedFrames, socketBufferedBytes: socket.bufferedAmount });
    }
  }
}
async function stopNative() {
  return stopPromise ??= (async () => {
    stopping = true; activateResolve(false);
    try { await setupPromise; } catch { /* Reconcile a late successful BEGIN below. */ }
    let confirmed = !commitSent, error = '';
    if (generation) {
      try {
        if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('stream-not-open');
        const stopped = waitFor('STOPPED', 700);
        socket.send(controlPacket(WS_STOP));
        const proof = await stopped;
        if (proof.confirmed !== true) throw new Error('native-stop-unconfirmed');
        confirmed = true;
      } catch (streamError) {
        // Generation-qualified control fallback. A socket close alone is no proof.
        try {
          const proof = await getJson('/v1/post-master/stop', { method: 'POST', headers: headers(), body: 'generation=' + generation });
          if (proof.confirmed !== true || Number(proof.generation) !== generation) throw new Error('native-stop-unconfirmed');
          confirmed = true;
        } catch (httpError) { error = String(httpError || streamError); }
      }
    }
    socket?.close();
    rejectWaiters(new Error('output-session-stopped'));
    return { type: 'STOPPED', confirmed, error };
  })();
}
function fail(error) {
  if (faultSent || stopping) return;
  faultSent = true;
  post({ type: 'FAULT', error: String(error?.message || error) });
  void stopNative().then(post);
}
self.onmessage = ({ data: message }) => {
  if (message.type === 'INIT') {
    if (initialized) { fail(new Error('duplicate-init')); return; }
    initialized = true;
    sampleRate = Number(message.sampleRate); blockFrames = Number(message.blockFrames); prefillFrames = Number(message.prefillFrames);
    baseUrl = String(message.baseUrl).replace(/\/$/, '');
    writePtr = new Uint32Array(message.audioSab, 0, 1); readPtr = new Uint32Array(message.audioSab, 4, 1);
    storage = new Float32Array(message.audioSab, 8); control = new Int32Array(message.controlSab); capacity = storage.length;
    packetBuffer = new ArrayBuffer(32 + blockFrames * 2 * 4); packetView = new DataView(packetBuffer);
    packetSamples = new Float32Array(packetBuffer, 32);
    setupPromise = bootstrap();
    void pump().catch(fail);
  } else if (message.type === 'COMMIT') {
    if (!stopping && prefilled && Number(message.generation) === generation) activateResolve(true);
    else if (!stopping) fail(new Error('commit-before-prefill-or-stale-generation'));
  } else if (message.type === 'STOP') { void stopNative().then(post); }
};
`;
