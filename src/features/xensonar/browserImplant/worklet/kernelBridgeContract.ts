export interface RealKernelBridge {
  readonly memory: WebAssembly.Memory;
  readonly maxRenderFrames: number;
  readonly epoch: number;
  /** Actual frames rendered by this instance; panic never resets this clock. */
  readonly renderedFrames: number;
  /** Submit one fixed C11 browser record. Kernel owns timing/lateness/admission. */
  submitRecord(record: Uint32Array): number;
  /** Compatibility alias retained for Direct-Synth-Core. */
  submitTonePlan(record: Uint32Array): number;
  panic(): number;
  render(frames: number): void;
  outputLeft(): Float32Array;
  outputRight(): Float32Array;
  outputAux(route: number): Float32Array;
  destroy(): void;
}
