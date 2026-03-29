import { RhythmForgeAudioEngine } from "./audio";
import { generateGroovePattern } from "./patterns";
import {
  DEFAULT_RHYTHMFORGE_PARAMS,
  type GeneratedPattern,
  type GrooveState,
  type RhythmForgeOptions,
  type RhythmForgeParams,
  type SequencerTickResult,
} from "./types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export class RhythmForge {
  readonly output: GainNode;
  readonly input: GainNode;
  readonly engine: RhythmForgeAudioEngine;

  private params: RhythmForgeParams;
  private grooveState: GrooveState = {
    time: 0,
    descriptors: {
      cohesion: 0.5,
      turbulence: 0.35,
      crystallization: 0.45,
      pressure: 0.4,
      fracture: 0.2,
      orbitality: 0.3,
      recurrence: 0.35,
    },
    spectralCentroidHz: 1000,
  };
  private currentPattern: GeneratedPattern;
  private nextBarTime = 0;
  private started = false;
  private barIndex = 0;
  private lookaheadSeconds = 0.18;
  private seed = 0x59a17;

  constructor(private readonly ctx: AudioContext, options: RhythmForgeOptions = {}) {
    this.params = { ...DEFAULT_RHYTHMFORGE_PARAMS, ...(options.params ?? {}) };
    this.engine = new RhythmForgeAudioEngine(ctx);
    this.output = this.engine.output;
    this.input = this.engine.input;
    this.engine.setParams(this.params);
    this.currentPattern = generateGroovePattern({
      barIndex: 0,
      seed: this.seed,
      rootHz: this.params.rootHz,
      baseSwing: this.params.swing,
      descriptors: this.grooveState.descriptors,
    });
  }

  setParams(next: Partial<RhythmForgeParams>) {
    this.params = { ...this.params, ...next };
    this.params.tempo = clamp(this.params.tempo, 40, 220);
    this.params.swing = clamp(this.params.swing, 0, 0.22);
    this.params.rootHz = clamp(this.params.rootHz, 24, 220);
    this.params.barsUntilRefresh = clamp(Math.round(this.params.barsUntilRefresh), 1, 8) as RhythmForgeParams["barsUntilRefresh"];
    this.engine.setParams(this.params);
  }

  getParams() {
    return { ...this.params };
  }

  updateGrooveState(state: GrooveState) {
    this.grooveState = state;
  }

  connect(destination: AudioNode) {
    this.output.connect(destination);
  }

  disconnect() {
    this.output.disconnect();
  }

  start(atTime = this.ctx.currentTime + 0.02) {
    if (this.started) return;
    this.started = true;
    this.nextBarTime = atTime;
    this.barIndex = 0;
  }

  stop() {
    this.started = false;
  }

  tick(now = this.ctx.currentTime): SequencerTickResult {
    if (!this.started || !this.params.enabled) {
      return {
        scheduledUntil: this.nextBarTime,
        currentPattern: this.currentPattern,
      };
    }

    const barDuration = (60 / this.params.tempo / 4) * this.params.patternLength;
    while (this.nextBarTime < now + this.lookaheadSeconds) {
      if (this.barIndex === 0 || this.barIndex % this.params.barsUntilRefresh === 0) {
        this.currentPattern = generateGroovePattern({
          barIndex: this.barIndex,
          seed: this.seed,
          rootHz: this.params.rootHz,
          baseSwing: this.params.swing,
          descriptors: this.grooveState.descriptors,
        });
      }
      this.engine.schedulePattern(this.currentPattern, this.params, this.nextBarTime);
      this.nextBarTime += barDuration;
      this.barIndex += 1;
    }

    return {
      scheduledUntil: this.nextBarTime,
      currentPattern: this.currentPattern,
    };
  }

  dispose() {
    this.stop();
    this.engine.dispose();
  }
}
