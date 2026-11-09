/** Fixed-size aggregate diagnostics. Hot paths only increment numbers/buckets;
 * named objects and array copies are created on an explicit cold snapshot. */
export class FixedCounters {
  private readonly values: Float64Array;
  constructor(readonly names: readonly string[]) { this.values = new Float64Array(names.length); }
  add(index: number, count = 1): void { this.values[index] += count; }
  snapshot(): Record<string, number> {
    return Object.fromEntries(this.names.map((name, i) => [name, this.values[i]]));
  }
}
export class FixedHistogram {
  private readonly values: Float64Array;
  count = 0;
  min = Infinity;
  max = -Infinity;
  invalid = 0;
  constructor(readonly upperInclusive: readonly number[]) { this.values = new Float64Array(upperInclusive.length + 1); }
  observe(value: number): void {
    if (!Number.isFinite(value)) { this.invalid++; return; }
    this.count++; this.min = Math.min(this.min, value); this.max = Math.max(this.max, value);
    let bin = 0;
    while (bin < this.upperInclusive.length && value > this.upperInclusive[bin]) bin++;
    this.values[bin]++;
  }
  snapshot() {
    return {upperInclusive: [...this.upperInclusive], counts: Array.from(this.values),
      count: this.count, min: this.count ? this.min : null, max: this.count ? this.max : null, invalid: this.invalid};
  }
}
export const INPUT_AGE_BOUNDS_MS = [-0.001, 2, 5, 10, 20, 50, 100] as const;
export const TARGET_SLACK_BOUNDS_FRAMES = [-1024, -256, -128, -1, 0, 128, 256, 512, 1024] as const;
export const enum ProducerReject { Inactive, InvalidTarget, TargetPast, Transport, QuantumCap, InvalidDemand, DuplicateToken, Units, Voices, Capacity }
export const PRODUCER_REJECT_NAMES = ['inactive', 'invalidTarget', 'targetPast', 'transportCapacity', 'quantumCap', 'invalidDemand', 'duplicateToken', 'renderUnits', 'voices', 'reservationCapacity'] as const;
export const enum SubmitReject { MissingReservation, Inactive, Epoch, TargetMismatch, TargetPast, Underestimated, Transport, TransportException }
export const SUBMIT_REJECT_NAMES = ['missingReservation', 'inactive', 'oldEpoch', 'targetMismatch', 'targetPast', 'underestimated', 'transportCapacity', 'transportException'] as const;
export const enum ConsumerReject { Inactive, Stale, BadRecord, OldEpoch, Reservation, PortFull, Kernel, BadBuffer }
export const CONSUMER_REJECT_NAMES = ['inactive', 'stale', 'badRecordOrProfile', 'oldEpoch', 'reservationCapacity', 'portQueueFull', 'kernelNonzero', 'badBuffer'] as const;
export const enum FenceReason { Context, Mute, Panic, Stop }
export const FENCE_REASON_NAMES = ['contextDiscontinuity', 'explicitMute', 'explicitPanic', 'stop'] as const;
export const enum ReleaseReason { End, Rejection, Fence, Cancel }
export const RELEASE_REASON_NAMES = ['normalEnd', 'rejection', 'sessionFence', 'producerCancel'] as const;
