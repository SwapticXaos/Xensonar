import { STABLE_MUSIC_LANE_WORKLET_PROCESSOR_NAME } from './stableMusicLaneContracts';
import { createAudioWorkletBlobModuleUrl } from './audioWorkletBlobModule';

const STABLE_MUSIC_LANE_WORKLET_PROCESSOR_SOURCE = String.raw`
class XensonarStableMusicLaneProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.schemaVersion = 1;
    this.processorName = 'xensonar-stable-music-lane-worklet';
    this.processorGeneration = 4;
    this.running = false;
    this.mode = 'speaker-probe';
    this.generation = 0;
    this.lastSnapshotGeneration = 0;
    this.laneCount = 0;
    this.rootFollowAnchorHz = null;
    this.rootFollowTargetHz = null;
    this.processQuantumCount = 0;
    this.heartbeatCount = 0;
    this.heartbeatEveryFrames = Math.max(2048, Math.floor(sampleRate * 0.25));
    this.nextHeartbeatFrame = this.getWorkletFrame() + this.heartbeatEveryFrames;
    this.beatPlan = null;
    this.beatEventsByStep = [];
    this.beatStepFrames = Math.max(1, Math.floor(sampleRate * 60 / 108 / 4));
    this.beatStepsPerBar = 16;
    this.beatTransportOriginFrame = this.getWorkletFrame();
    this.lastRenderedBeatStepIndex = -1;
    this.beatVoices = [];
    this.beatTriggerCount = 0;
    this.speakerProofPulseCount = 0;
    this.speakerProofLastQuarterIndex = -1;
    this.speakerProofPhase = 0;
    this.speakerProofPeakAbs = 0;
    this.peakAbs = 0;
    this.port.onmessage = (event) => this.handleMessage(event.data || {});
    this.postReady();
  }

  getWorkletFrame() {
    return typeof currentFrame === 'number' ? currentFrame : 0;
  }

  isBeatAudioRunning() {
    return this.running && this.mode === 'beat-audible' && !!(this.beatPlan && this.beatPlan.active);
  }

  isSpeakerProbeRunning() {
    return this.running && this.mode === 'speaker-probe';
  }

  getActiveBeatVoiceCount() {
    return this.beatVoices.length;
  }

  postReady() {
    this.port.postMessage({
      type: 'stable-music-lane-ready',
      schemaVersion: this.schemaVersion,
      processorName: this.processorName,
      processorGeneration: this.processorGeneration,
      workletFrame: this.getWorkletFrame(),
      sampleRate,
    });
  }

  postAck(acceptedType) {
    this.port.postMessage({
      type: 'stable-music-lane-ack',
      schemaVersion: this.schemaVersion,
      generation: this.generation,
      acceptedType,
      running: this.running,
      workletFrame: this.getWorkletFrame(),
      laneCount: this.laneCount,
      rootFollowAnchorHz: this.rootFollowAnchorHz,
      rootFollowTargetHz: this.rootFollowTargetHz,
      beatAudioRunning: this.isBeatAudioRunning(),
      beatTriggerCount: this.beatTriggerCount,
      activeBeatVoiceCount: this.getActiveBeatVoiceCount(),
      speakerProofPulseCount: this.speakerProofPulseCount,
      speakerProofPeakAbs: this.speakerProofPeakAbs,
      peakAbs: this.peakAbs,
    });
  }

  postReject(rejectedType, reason, generation) {
    this.port.postMessage({
      type: 'stable-music-lane-reject',
      schemaVersion: this.schemaVersion,
      generation: Number.isFinite(Number(generation)) ? Number(generation) : this.generation,
      rejectedType: String(rejectedType || 'unknown'),
      reason,
      workletFrame: this.getWorkletFrame(),
    });
  }

  postHeartbeat() {
    this.heartbeatCount += 1;
    this.port.postMessage({
      type: 'stable-music-lane-heartbeat',
      schemaVersion: this.schemaVersion,
      generation: this.generation,
      running: this.running,
      workletFrame: this.getWorkletFrame(),
      processQuantumCount: this.processQuantumCount,
      heartbeatCount: this.heartbeatCount,
      lastSnapshotGeneration: this.lastSnapshotGeneration,
      laneCount: this.laneCount,
      rootFollowAnchorHz: this.rootFollowAnchorHz,
      rootFollowTargetHz: this.rootFollowTargetHz,
      beatAudioRunning: this.isBeatAudioRunning(),
      beatTriggerCount: this.beatTriggerCount,
      activeBeatVoiceCount: this.getActiveBeatVoiceCount(),
      speakerProofPulseCount: this.speakerProofPulseCount,
      speakerProofPeakAbs: this.speakerProofPeakAbs,
      peakAbs: this.peakAbs,
    });
  }

  extractRootFollowShadow(lanes) {
    if (!Array.isArray(lanes)) return;
    const rootFollow = lanes.find((lane) => lane && lane.lane === 'rootFollow');
    if (!rootFollow) return;
    const anchor = Number(rootFollow.anchorHz);
    const target = Number(rootFollow.targetHz);
    this.rootFollowAnchorHz = Number.isFinite(anchor) ? Math.max(1, anchor) : null;
    this.rootFollowTargetHz = Number.isFinite(target) ? Math.max(1, target) : null;
  }

  setBeatPlan(lanes, transport) {
    const beat = Array.isArray(lanes) ? lanes.find((lane) => lane && lane.lane === 'beat') : null;
    this.beatPlan = beat || null;
    const bpm = Math.max(12, Math.min(360, Number((transport && transport.bpm) || 108)));
    const stepsPerBar = Math.max(1, Math.min(128, Math.round(Number((beat && beat.stepsPerBar) || (transport && transport.stepsPerBar) || 16))));
    const beatsPerBar = Math.max(1, Math.min(16, Math.round(Number((transport && transport.beatsPerBar) || 4))));
    this.beatStepsPerBar = stepsPerBar;
    this.beatStepFrames = Math.max(1, Math.floor((sampleRate * 60 * beatsPerBar / bpm) / stepsPerBar));
    const eventsByStep = Array.from({ length: stepsPerBar }, () => []);
    const hits = Array.isArray(beat && beat.hits) ? beat.hits : [];
    for (const hit of hits) {
      const rawStep = Math.round(Number(hit && hit.step));
      if (!Number.isFinite(rawStep)) continue;
      const step = ((rawStep % stepsPerBar) + stepsPerBar) % stepsPerBar;
      const lane = String((hit && hit.lane) || 'ghost');
      if (lane !== 'kick' && lane !== 'snare' && lane !== 'hat' && lane !== 'ghost') continue;
      const velocity = Math.max(0, Math.min(1.5, Number(hit.velocity) || 0));
      if (velocity <= 0.001) continue;
      eventsByStep[step].push({ lane, velocity });
    }
    this.beatEventsByStep = eventsByStep;
    if (this.lastRenderedBeatStepIndex < 0) {
      this.beatTransportOriginFrame = this.getWorkletFrame();
      this.lastRenderedBeatStepIndex = -1;
    }
  }

  assertNoExpressiveLane(lanes, generation) {
    if (!Array.isArray(lanes)) return true;
    for (const lane of lanes) {
      const id = String((lane && lane.lane) || '');
      if (id === 'wellenstarter' || id === 'waveStarter' || id === 'particle' || id === 'resident' || id === 'collision') {
        this.postReject('stable-music-lane-snapshot', 'expressive-lane-rejected:' + id, generation);
        return false;
      }
    }
    return true;
  }

  handleMessage(data) {
    if (data.schemaVersion !== this.schemaVersion) {
      this.postReject(data.type, 'schema-version-mismatch', data && data.generation);
      return;
    }
    if (data.type === 'stable-music-lane-start') {
      this.running = true;
      this.mode = data.mode === 'speaker-probe' ? 'speaker-probe' : (data.mode === 'beat-audible' ? 'beat-audible' : 'shadow');
      this.generation = Math.max(this.generation + 1, Math.round(Number(data.generation) || 1));
      this.postAck(data.type);
      return;
    }
    if (data.type === 'stable-music-lane-stop') {
      this.running = false;
      this.generation = Math.max(this.generation + 1, Math.round(Number(data.generation) || this.generation + 1));
      this.postAck(data.type);
      return;
    }
    if (data.type === 'stable-music-lane-snapshot') {
      const snapshot = data.snapshot || {};
      const lanes = Array.isArray(snapshot.lanes) ? snapshot.lanes : [];
      if (!this.assertNoExpressiveLane(lanes, snapshot.generation)) return;
      this.mode = snapshot.mode === 'speaker-probe' ? 'speaker-probe' : (snapshot.mode === 'beat-audible' ? 'beat-audible' : 'shadow');
      this.generation = Math.max(this.generation, Math.round(Number(snapshot.generation) || this.generation));
      this.lastSnapshotGeneration = Math.round(Number(snapshot.generation) || this.lastSnapshotGeneration);
      this.laneCount = lanes.length;
      this.extractRootFollowShadow(lanes);
      this.setBeatPlan(lanes, snapshot.transport || {});
      this.postAck(data.type);
      return;
    }
    if (data.type === 'stable-music-lane-request-heartbeat') {
      this.postHeartbeat();
      return;
    }
    this.postReject(data.type, 'unknown-message-type', data.generation);
  }

  triggerBeatEventsForStep(stepIndex) {
    if (!this.isBeatAudioRunning()) return;
    const events = this.beatEventsByStep[((stepIndex % this.beatStepsPerBar) + this.beatStepsPerBar) % this.beatStepsPerBar] || [];
    const volume = Math.max(0.75, Math.min(1, Number(this.beatPlan && this.beatPlan.volume) || 0.95));
    const proofEvents = stepIndex % 4 === 0 ? [{ lane: 'speakerProof', velocity: 1.15 }] : [];
    for (const event of [...proofEvents, ...events]) {
      if (this.beatVoices.length >= 24) break;
      const velocity = Math.max(0, Math.min(1.5, event.velocity || 0)) * volume;
      if (velocity <= 0.001) continue;
      this.beatVoices.push({
        lane: event.lane,
        age: 0,
        velocity,
        phase: 0,
        seed: ((stepIndex + 1) * 1103515245 + this.beatTriggerCount * 12345) & 0x7fffffff,
      });
      this.beatTriggerCount += 1;
    }
  }

  renderBeatVoices(outputs) {
    const output = outputs && outputs[0];
    if (!output || output.length === 0) return;
    const left = output[0];
    const right = output[1] || output[0];
    const frameBase = this.getWorkletFrame();
    if (this.isBeatAudioRunning()) {
      const startRel = Math.max(0, frameBase - this.beatTransportOriginFrame);
      const endRel = startRel + left.length;
      const startStep = Math.floor(startRel / this.beatStepFrames);
      const endStep = Math.floor((endRel - 1) / this.beatStepFrames);
      for (let step = Math.max(this.lastRenderedBeatStepIndex + 1, startStep); step <= endStep; step += 1) {
        this.triggerBeatEventsForStep(step);
        this.lastRenderedBeatStepIndex = step;
      }
    }
    let peak = 0;
    const survivors = [];
    for (let i = 0; i < left.length; i += 1) {
      let sample = 0;
      for (const voice of this.beatVoices) {
        const ageSec = voice.age / sampleRate;
        if (voice.lane === 'kick') {
          const env = Math.exp(-ageSec * 24);
          const freq = 48 + 92 * Math.exp(-ageSec * 42);
          voice.phase += 2 * Math.PI * freq / sampleRate;
          sample += Math.sin(voice.phase) * env * voice.velocity * 0.9;
        } else if (voice.lane === 'snare') {
          voice.seed = (voice.seed * 1664525 + 1013904223) >>> 0;
          const noise = ((voice.seed / 0xffffffff) * 2 - 1);
          const env = Math.exp(-ageSec * 34);
          const body = Math.sin(2 * Math.PI * 180 * ageSec) * Math.exp(-ageSec * 18);
          sample += (noise * 0.55 + body * 0.45) * env * voice.velocity * 0.52;
        } else if (voice.lane === 'hat') {
          voice.seed = (voice.seed * 1103515245 + 12345) >>> 0;
          const noise = ((voice.seed / 0xffffffff) * 2 - 1);
          const env = Math.exp(-ageSec * 85);
          sample += noise * env * voice.velocity * 0.22;
        } else if (voice.lane === 'speakerProof') {
          const env = Math.exp(-ageSec * 26);
          const freq = 92 + 160 * Math.exp(-ageSec * 30);
          voice.phase += 2 * Math.PI * freq / sampleRate;
          sample += Math.sin(voice.phase) * env * voice.velocity * 0.95;
        } else {
          const env = Math.exp(-ageSec * 60);
          sample += Math.sin(2 * Math.PI * 440 * ageSec) * env * voice.velocity * 0.12;
        }
        voice.age += 1;
      }
      if (this.isSpeakerProbeRunning()) {
        const proofHalfSecondIndex = Math.floor((frameBase + i) / Math.max(1, Math.floor(sampleRate * 0.5)));
        if (proofHalfSecondIndex !== this.speakerProofLastQuarterIndex) {
          this.speakerProofLastQuarterIndex = proofHalfSecondIndex;
          this.speakerProofPulseCount += 1;
        }
        this.speakerProofPhase += 2 * Math.PI * 220 / sampleRate;
        const proof = Math.sin(this.speakerProofPhase) * 0.68;
        sample += proof;
        this.speakerProofPeakAbs = Math.max(this.speakerProofPeakAbs * 0.9995, Math.abs(proof));
      }
      if (this.isBeatAudioRunning()) {
        const relFrame = Math.max(0, (frameBase + i) - this.beatTransportOriginFrame);
        const quarterFrames = Math.max(1, this.beatStepFrames * 4);
        const quarterIndex = Math.floor(relFrame / quarterFrames);
        const quarterAgeFrames = relFrame - quarterIndex * quarterFrames;
        if (quarterIndex !== this.speakerProofLastQuarterIndex && quarterAgeFrames < left.length) {
          this.speakerProofLastQuarterIndex = quarterIndex;
          this.speakerProofPulseCount += 1;
        }
        if (quarterAgeFrames < sampleRate * 0.075) {
          const ageSec = quarterAgeFrames / sampleRate;
          const env = Math.exp(-ageSec * 34);
          this.speakerProofPhase += 2 * Math.PI * 146 / sampleRate;
          const proof = Math.sin(this.speakerProofPhase) * env * 0.48;
          sample += proof;
          this.speakerProofPeakAbs = Math.max(this.speakerProofPeakAbs * 0.999, Math.abs(proof));
        }
      }
      sample = Math.max(-0.95, Math.min(0.95, sample));
      left[i] += sample;
      right[i] += sample;
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
    }
    for (const voice of this.beatVoices) {
      const maxAge = voice.lane === 'kick' ? 0.42 : voice.lane === 'snare' ? 0.28 : voice.lane === 'speakerProof' ? 0.22 : 0.12;
      if (voice.age / sampleRate < maxAge) survivors.push(voice);
    }
    this.beatVoices = survivors;
    this.peakAbs = Math.max(this.peakAbs * 0.985, peak);
  }

  process(_inputs, outputs) {
    this.processQuantumCount += 1;
    const output = outputs && outputs[0];
    if (output) {
      for (let channel = 0; channel < output.length; channel += 1) {
        output[channel].fill(0);
      }
    }
    this.renderBeatVoices(outputs);
    const frame = this.getWorkletFrame();
    if (frame >= this.nextHeartbeatFrame) {
      this.postHeartbeat();
      this.nextHeartbeatFrame = frame + this.heartbeatEveryFrames;
    }
    return true;
  }
}

registerProcessor('xensonar-stable-music-lane-worklet', XensonarStableMusicLaneProcessor);
`;

export function createStableMusicLaneWorkletProcessorBlobUrl(): string {
  return createAudioWorkletBlobModuleUrl(STABLE_MUSIC_LANE_WORKLET_PROCESSOR_SOURCE);
}

export const STABLE_MUSIC_LANE_WORKLET_PROCESSOR_MARKER = STABLE_MUSIC_LANE_WORKLET_PROCESSOR_NAME;
