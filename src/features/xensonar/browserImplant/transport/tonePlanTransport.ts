export type TonePlanTransportKind = "message-port-pool" | "ringbuf-sab";
export interface TonePlanWriter {
  readonly kind: TonePlanTransportKind;
  readonly availableRecords: number;
  trySend(record: Uint32Array): boolean;
  destroy(): void;
}
