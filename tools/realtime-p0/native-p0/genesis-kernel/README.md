# xen-audio — Xensonar Native Audio Module

A small native realtime audio kernel. C11, no dependencies
beyond libc/pthreads (plus libpipewire-0.3 for the device backend).

This is the execution substrate only. **The sound it currently makes is
placeholder material** — see `MUSICAL_SEMANTICS.md`. Nothing here claims
Xensonar parity.

```
control client (browser / world / test)      may stall, may disconnect
        │  Gesture · State · Program · Asset        (transport agnostic)
        ▼
xen_audio.h                                  the entire public ABI
        ▼
engine   clock · scheduler · voices · DSP · Forge · Master · Recorder
        ▼
backend  prepare/start/render/query/stop/destroy
        ├── null     deterministic, offline, no device
        └── pipewire 48 kHz stereo, variable quantum
```

---

## Build

```sh
# library, tools, tests (this is what produced EVIDENCE.md)
make -j && make test

# or cmake
cmake -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo && cmake --build build -j
ctest --test-dir build --output-on-failure

# with the device backend (needs libpipewire-0.3-dev)
make PIPEWIRE=1 -j
cmake -B build -DXEN_WITH_PIPEWIRE=ON && cmake --build build -j
```

```sh
./build/xen-render --seconds 8 --partition ragged --out ep.wav   # offline episode
./build/xen-bench 1.85                                           # throughput
./build/xen-host --seconds 30 --record out.wav                   # PipeWire (needs a device)
bash tests/run_all.sh                                            # acceptance report
```

---

## The five contracts

### 1. Time

One absolute frame counter per engine owns musical time. `xen_engine_render()`
takes a frame count that may change on every call and never enters a musical
decision. Inside a call the dispatcher splits the block at the next due event,
so an event at frame 130 777 executes at frame 130 777 whether the device hands
over 33, 512, 1024 or 64/127/511/128/1024/73/256 frames at a time.

Three times are kept strictly apart:

| | |
|---|---|
| arrival time | when the control thread called submit. Never musical. |
| effective frame | `cmd.frame`. The musical time. Survives every boundary. |
| callback boundary | the `frames` argument. An implementation detail. |

Anything derived from wall-clock or callback count inside DSP is a bug. Two
such bugs were found by the tests during development and are documented in
`EVIDENCE.md`.

### 2. Lateness — default `XEN_LATE_DROP`

A gesture that arrives after its intended frame is **rejected**, synchronously,
with `XEN_ERR_STALE`, and counted. It is never moved to the current frame.

This is the conservative default and it makes catch-up compression structurally
impossible: twenty-four late attacks with twenty-four distinct intended frames
produce zero sound rather than one dense chord.

`XEN_LATE_CLAMP` with a tolerance is available and *can* collapse several late
attacks onto one frame. It is opt-in, named, and tested as such.

**Releases are exempt from both policies.** A terminal lifecycle command is
never discarded for being late, and there is no dedup set a rejected command
could poison. Priority order (§10 of the brief):

```
panic  >  release/cancel  >  live attack  >  autonomous texture  >  telemetry
```

Overload is always observable: `attacks_denied_no_voice`,
`grains_denied_no_voice`, `dropped_stale`, `dropped_queue_full`,
`dropped_sched_full`. Nothing is silently thinned.

### 3. Epoch and session

Program handles are `[epoch:16][generation:32][slot:16]`. `xen_engine_panic()`
increments the epoch, so *every* previously issued handle fails closed —
whether the caller passes the old epoch (`XEN_ERR_EPOCH`) or the new one
(`XEN_ERR_HANDLE`). In-flight commands are dropped at the drain, and the
scheduler is flushed at the fence frame. Assets deliberately survive a panic:
they are inert data and cannot make sound without a program.

### 4. Assets

An asset is freed only when `prog_refs == 0 && voice_refs == 0`. A program
holds a reference for its whole life, so retiring an asset while a program is
merely *between* grains cannot invalidate the grain that has not been generated
yet. `xen_asset_retire()` returns `XEN_RETIRE_DEFERRED` or `XEN_RETIRE_DONE`;
it never changes what you hear. Creating a program against a retiring asset
fails closed.

### 5. Determinism

Two separate, non-interchangeable gates:

* **Bit-identical** — same binary, same machine, same seed, same timed inputs,
  any callback partitioning. Asserted with `memcmp`, not a tolerance. Built
  with `-ffp-contract=off -fno-fast-math`; the RNG is integer-only splitmix64
  and random doubles are formed from 24 bits so they are exact in binary64.
* **Cross-platform** — *not* claimed. Different libm `sin`/`cos`/`exp`
  implementations and different FP contraction will differ in the last bits.
  A cross-platform comparison would need an explicit tolerance gate; none is
  shipped, because shipping one would blur the first contract.

---

## Threading

```
control thread   create/destroy, publish assets, submit commands, maintain()
      │ SPSC ring + latest-wins mailbox + dedicated atomic Panic/epoch fence
realtime thread  xen_engine_render() only
      │ bounded recorder ring
writer thread    WAV file I/O
```

Program slots use a state machine with release/acquire publication and disjoint transition ownership —
control does `FREE→ARMED` and `DEAD→FREE`, realtime does `ARMED→LIVE`,
`LIVE→DYING`, `DYING→DEAD` — so no lock is needed and no slot is recycled
while the realtime thread can still reach it. The asset mutex is control-side
only and is never taken in the callback.

## Realtime discipline

The callback does no allocation, no I/O, no syscalls, no locking, and no
unbounded scan. This is demonstrated rather than asserted: `test_rt_alloc`
links with `-Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,
--wrap=posix_memalign`, proves the detector fires on a known allocation, then
requires zero across 900 ragged blocks with gestures, timed state, program
updates, an active recorder and a panic. If the toolchain cannot wrap, the test
reports `NOT VERIFIED` instead of passing.

## Bounds

| resource | cap | note |
|---|---|---|
| voices | 512 | SoA pools, birth-ordered active set, O(1) steal |
| programs | 64 | |
| command ring | 4096 | overflow → `XEN_ERR_QUEUE_FULL` |
| scheduler | 4096 | fixed min-heap, O(log N) insert/pop; overflow → counted |
| assets | 256 | PCM on the heap, handles are integers |
| grains per step | 32 | bounds generator output |
| recorder ring | configurable | overflow → `XEN_REC_OVERRUN`, latched |

Cost scales with the active set, never with capacity.

## Generator seam

`xen_engine_set_grain_generator()` replaces the entire grain-event generator
with a host-supplied realtime-safe function. The built-in one is explicitly
labelled `EXPERIMENTAL_PLACEHOLDER`. When canonical Root Follow behaviour is
recovered from the reference implementation it drops in here without touching
the substrate.

## Xensonar implant boundary

The long-term cut is not "React versus C". Xensonar keeps musical meaning;
Native owns execution once that meaning becomes audio time, voices, grains, DSP,
routing, Master or Recording. The adapter produces **no audio**.

The current 387 per-window Root Follow bridge is migration/reference tissue, not
the target ABI. Wave-style adapters receive already-resolved Hz rather than a
fabricated native tuning ladder. See `IMPLANT_BOUNDARY.md` for the concrete cut
map against the current Xensonar source.

## Source tree

```
include/xen/xen_audio.h        public ABI (the whole contract)
include/xen/xen_xensonar.h     provisional semantic implant adapter; resolved pitch
src/core/    engine.c command.c voice.c asset.c recorder.c
src/dsp/     xen_dsp.c
src/programs/xen_prog_granular.c   + the generator seam
src/backends/xen_backend_null.c  xen_backend_pipewire.c
src/adapters/xen_xensonar.c
tests/       11 executable tests + run_all.sh + fixtures
tools/       xen-render (offline) xen-bench xen-host (PipeWire)
```

## Evidence classification

Every claim in this delivery is tagged `VERIFIED`, `IMPLEMENTED_NOT_EXECUTED`,
`EXPERIMENTAL`, `TARGET` or `UNKNOWN`. See `EVIDENCE.md` and
`KNOWN_LIMITATIONS.md`. In particular the PipeWire backend is
`IMPLEMENTED_NOT_EXECUTED`: real code, never compiled, never run on hardware.
