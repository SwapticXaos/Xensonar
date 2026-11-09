# Xensonar P0-N Native Architecture Prep (331-prephysical PipeWire proof hardening)

Status: **validated Native host/lifecycle + physical-evidence gate on top of 330; PipeWire remains explicitly BLOCKED only by this container's missing dev headers/server; no product audio ownership change**.

This directory intentionally starts the native-host experiment **without** changing `src/`, the 323 reference, the 320 performance oracle, the frozen P0-W WASM, or the P0-W control/PCM protocols.

## Why this exists

The research target is no longer merely "can the Worklet survive a particular browser stall?". The target is whether Xensonar can obtain a qualitatively larger realtime operating envelope by moving musical clock + persistent voice/DSP ownership into a dedicated native audio domain.

P0-W/326-audit1 is kept as a browser comparison and protocol evidence. It no longer blocks preparing P0-N.

## Implemented here

- `src/p0_native_audio_driver.h`: device-host seam. No PipeWire/ALSA/CPAL types leak into DSP/control semantics.
- `src/p0_native_transport.h`: fixed SPSC attack ring with ingress-stamped source/intended/deadline frames, C11-race-free latest-state mailbox, terminal release high-water marks, separate heartbeat/panic safety channel.
- `src/p0_native_null_driver.c`: **non-audible** callback-thread driver for architecture tests only.
- `src/p0_native_host.c`: same `p0_core.c`, owned only by the callback domain after prepare. No JSON, network, allocation or lock in render callback.
- `src/p0_native_headroom.c`: native raw-DSP timing probe; not a physical-audio benchmark.
- `tests/test_native_transport.c`: boundedness, concurrent SPSC preservation, monotonic latest-state snapshots, lock-free atomics, release high-water test.
- `build-native-prep.sh`: compile and execute the isolated native prep.
- `run-native-tsan.sh`: ThreadSanitizer transport/mailbox gate.
- `run-native-sanitizers.sh`: ASAN/UBSAN adversarial host gate.
- `validate-native-p0.sh`: one-command frozen-input + build + causality + sanitizer validation gate.


## 329 PipeWire host candidate

- `src/p0_native_pipewire_driver.c`: direct PipeWire implementation behind the existing device-driver ABI.
- Requests interleaved stereo `F32` at 48 kHz and uses `PW_STREAM_FLAG_RT_PROCESS`.
- The process callback performs no allocation, file I/O, socket I/O, mutex locking, JSON, or program construction.
- `SPA_IO_CLOCK_FLAG_XRUN_RECOVER` is surfaced as cumulative XRun telemetry.
- Actual callback frame count is reported as the negotiated/runtime quantum rather than silently forcing 128.
- `run-pipewire-n1.sh` first runs the full non-physical Native gate, then builds and runs the physical 100/250/500/1000 ms stall test.
- `probe-pipewire-toolchain.sh` distinguishes runtime presence, development headers/pkg-config, server socket, build readiness, and physical readiness.

The current container has the PipeWire runtime library but not the development headers/pkg-config metadata, so the PipeWire source is **not claimed compiled or physically validated here**. The compile gate deliberately exits BLOCKED instead of weakening or bypassing that proof requirement.

## Non-claims

This does **not** prove PipeWire/ALSA/CPAL output, DAC continuity, driver latency, XRuns, realtime priority, browser-to-sidecar latency, or production sound parity. The null driver is deliberately not a fake PASS for physical audio.

The preliminary timing numbers describe only the same P0 C core on this container. They are useful for orders of magnitude, not a product performance oracle.

## Frozen inputs

- Product source remains 324/P1-derived; `src/` is untouched by 329 and byte-tree-identical to 327/328.
- 323 remains product gold reference for the P0-A sound comparison.
- 320 remains performance oracle.
- P0-W WASM remains SHA-256 `8add51d3875c0b4c5187b4ce8a581f03f3bc238b29b2f3277f05608e62809aa0`.
- `tools/realtime-p0/core/p0_core.c` is not modified by this native prep.

## Build locally

```bash
cd tools/realtime-p0/native-p0
./build-native-prep.sh
```

The null-host build uses only C11/pthreads/libm. Run `./validate-native-p0.sh` for the full automated gate. A real PipeWire driver remains the next seam; no physical-audio PASS is claimed by 328.


## 330 N1 evidence hardening

330 strengthens the host boundary without changing product audio ownership or P0 musical semantics. N1 now requires actual callback progress, stable bounded transport depth, no external transport catch-up, no render-budget misses, and (for physical audio) no new XRuns/process errors during each 100/250/500/1000 ms control stall. A generic start/stop/quiescence/restart driver contract is also part of the automated gate.

`run-pipewire-n1.sh` always writes `artifacts/P0N_PIPEWIRE_N1_GATE.json` with a final `PASS`, `BLOCKED`, or `FAIL` status. Missing PipeWire development headers are therefore an explicit BLOCKED compile stage rather than an ambiguous non-result. See `reports/SOL_330_N1_GATE_HARDENING.md` and `contracts/P0N_SOL_ROADMAP_AFTER_330.md`.


## 331-prephysical proof hardening

This candidate does not claim the roadmap's physical 331 PASS. It makes that future PASS harder to fake:

- PipeWire `actual_rate`, `actual_channels`, and `actual_block` begin at zero and are reset before every connection. Requested values are no longer pre-seeded as if they had been negotiated.
- `start()` only succeeds after a real `STREAMING` state **and** the requested 48 kHz stereo format has been observed through `param_changed`.
- Stereo positions are explicit FL/FR.
- `pw_buffer::size` is published in audio frames, as recommended by PipeWire, while chunk size remains bytes.
- PipeWire state errors and failed buffer return/queue operations contribute to device/process error telemetry.
- Driver lifecycle now requires a fresh negotiated format after restart, not only callback resumption.
- TSAN no longer reuses the strict realtime-deadline test. Sanitizer overhead had produced occasional synthetic null-driver XRuns; TSAN now runs a dedicated concurrency/observation contract while the unsanitized realtime gate keeps the strict XRun/budget assertions.
- `validate-pipewire-n1-evidence.py` independently validates the physical lifecycle/N1 NDJSON before the runner can emit PASS. It checks exact 48 kHz stereo negotiation, nonzero quantum/callbacks, the four stall durations, queue stability, no catch-up transport starts, no budget misses, no XRuns, no device errors, and a passing lifecycle/restart.
- The evidence validator has a synthetic unit fixture that proves an injected 500 ms XRun is rejected.
- `build-pipewire-host.sh` now emits a machine-readable build gate and compiles with warnings plus strict API-signature warnings.
- The full Native validation gate passed three consecutive repeat runs after these changes.

A physical PASS still requires the exact host source to compile against the machine's installed PipeWire development package and then run against a real user PipeWire server/device endpoint.
