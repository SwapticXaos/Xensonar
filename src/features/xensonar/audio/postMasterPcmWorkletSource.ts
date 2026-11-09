export const POST_MASTER_PCM_PROCESSOR_NAME = 'xensonar-post-master-pcm-tap';

/**
 * Steady-state allocation-free post-master tap (one startup fence message).
 * The ring layout is compatible with the
 * vendored ringbuf.js storage contract: uint32 write/read pointers followed by
 * Float32 interleaved stereo storage. The processor never overwrites unread
 * data. A full ring is a hard transport fault, not an invitation to catch up.
 */
export const POST_MASTER_PCM_WORKLET_SOURCE = String.raw`
class XensonarPostMasterPcmTap extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = options.processorOptions || {};
    this.audioSab = opts.audioSab;
    this.controlSab = opts.controlSab;
    this.writePtr = new Uint32Array(this.audioSab, 0, 1);
    this.readPtr = new Uint32Array(this.audioSab, 4, 1);
    this.storage = new Float32Array(this.audioSab, 8);
    this.control = new Int32Array(this.controlSab);
    this.storageCapacity = this.storage.length;
    this.fenceQuanta = 0;
    this.port.onmessage = ({data}) => { if (data.type === 'FENCE') this.fenceQuanta = 2; };
  }

  availableWrite() {
    const rd = Atomics.load(this.readPtr, 0);
    const wr = Atomics.load(this.writePtr, 0);
    const readable = (wr + this.storageCapacity - rd) % this.storageCapacity;
    return (this.storageCapacity - 1) - readable;
  }

  latchOrigin() {
    if (Atomics.load(this.control, 2) !== 0) return;
    const frame = currentFrame;
    Atomics.store(this.control, 0, frame >>> 0);
    Atomics.store(this.control, 1, Math.floor(frame / 4294967296) >>> 0);
    Atomics.store(this.control, 2, 1);
  }

  writeStereo(left, right, frames) {
    const samples = frames * 2;
    if (this.availableWrite() < samples) {
      Atomics.add(this.control, 3, frames);
      Atomics.store(this.control, 6, 1);
      return false;
    }
    let wr = Atomics.load(this.writePtr, 0);
    for (let i = 0; i < frames; i += 1) {
      this.storage[wr] = left ? (left[i] || 0) : 0;
      wr += 1;
      if (wr === this.storageCapacity) wr = 0;
      this.storage[wr] = right ? (right[i] || 0) : 0;
      wr += 1;
      if (wr === this.storageCapacity) wr = 0;
    }
    Atomics.store(this.writePtr, 0, wr);
    Atomics.add(this.control, 4, 1);
    Atomics.add(this.control, 5, frames);
    return true;
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (output) {
      for (let c = 0; c < output.length; c += 1) output[c].fill(0);
    }
    if (Atomics.load(this.control, 7) !== 0) return false;
    const input = inputs[0];
    const left = input && input[0];
    const frames = (output && output[0] && output[0].length) || (left && left.length) || 0;
    if (!frames) return true;
    const right = (input && input[1]) || left;
    // Before ownership changes, require a quiet start. A live cross-clock
    // handover is deliberately not disguised as a seamless output switch.
    if (left && Atomics.load(this.control, 10) === 0 && Atomics.load(this.control, 8) === 0) {
      for (let i = 0; i < left.length; i++) {
        if (Math.abs(left[i]) > 0.0000001 || Math.abs(right[i]) > 0.0000001) {
          Atomics.store(this.control, 8, 1); break;
        }
      }
    }
    if (Atomics.load(this.control, 9) !== 0) {
      this.latchOrigin();
      // Empty upstream input is musical silence, not a missing PCM interval.
      this.writeStereo(left, right, frames);
    }
    // WebAudio applies graph control messages before rendering. Waiting two
    // process calls also covers a port task arriving during the current quantum.
    if (this.fenceQuanta > 0 && --this.fenceQuanta === 0) {
      this.port.postMessage({ type: 'TAP_FENCED', frame: currentFrame });
    }
    return true;
  }
}
registerProcessor('${POST_MASTER_PCM_PROCESSOR_NAME}', XensonarPostMasterPcmTap);
`;
