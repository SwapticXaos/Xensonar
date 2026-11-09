# Evidence — hardened Native kernel

This report covers the hardened source tree in this package. The package, not
an earlier Arena answer, is the source of truth.

Evidence vocabulary:

- **VERIFIED** — executable code in this tree was built/run here and passed.
- **IMPLEMENTED_NOT_EXECUTED** — source exists but the required dependency or
  physical environment was unavailable.
- **EXPERIMENTAL** — deliberately invented musical behaviour used only as a
  workload.
- **UNKNOWN** — no reference evidence exists yet.

## Review environment

```text
kernel   : Linux 6.18.44 x86_64
compiler : cc (Debian 14.2.0-19) 14.2.0
PipeWire development package : unavailable
physical audio validation    : not performed
```

## Clean native acceptance

`make clean && make -j2 && make test`

Result after hardening:

```text
12 passed
0 failed
0 missing
PipeWire backend: NOT COMPILED in this environment
```

The executable gates include:

- deterministic seeded rendering;
- dynamic callback-partition invariance;
- epoch/program terminality;
- release/lateness semantics;
- asset retirement across inter-grain gaps;
- overload/resource bounds;
- Master/Recorder sample identity;
- planning versus active voice allocation;
- immediate post-Panic new-epoch work;
- saturated-ring Panic recovery;
- reverse-time 4096-command scheduler admission;
- concurrent control/render smoke;
- realtime allocator interception with positive control;
- tool-level offline partition cross-check.

## Clean out-of-tree CMake/CTest

```text
cmake -S . -B build_cmake
cmake --build build_cmake -j2
ctest --test-dir build_cmake --output-on-failure
```

Result:

```text
11/11 tests passed
```

The earlier recording-path failure caused by a hardcoded `build/test_record.wav`
path is fixed; the test now uses a process-unique temporary path.

## Panic / epoch hardening

The original candidate had two boundary defects:

1. Control epoch could advance before the RT epoch, so valid new-epoch work
   submitted immediately after Panic could be accepted and later dropped.
2. A full ordinary SPSC ring could make the control/producer side call `pop()`
   in order to force a Panic command through, violating single-consumer
   ownership.

The hardened design removes Panic from the ordinary command ring entirely.
`panic_epoch` is a dedicated atomic terminal fence. The RT owner applies it
before ordinary command admission and re-checks it during/after drain so a
concurrent Panic cannot misclassify new-epoch work.

Verified regression:

```text
panic()
create + activate new-epoch Program immediately
submit new-epoch Gesture immediately
render
=> Program active, Gesture executed, dropped_epoch == 0
```

A saturated old-epoch ring cannot defeat Panic. The old backlog is invalidated
by the fence and the normal ring retains strict producer/consumer ownership.

## Scheduler hardening

The original time-ordered scheduler inserted into a sorted fixed array. A legal
4096-command reverse-timestamp batch therefore had O(N^2) insertion work and
was observed in review at roughly 20 ms in one callback.

The hardened scheduler is a fixed-capacity deterministic min-heap ordered by
`(effective_frame, submission_seq)`:

```text
insert : O(log N)
pop    : O(log N)
allocation : none
capacity   : 4096
```

On this review environment the adversarial 4096-command admission test observed
approximately 0.2–0.4 ms for the drain/admission render call. This timing is
**informational, not a portable realtime guarantee**; the structural guarantee
is the fixed O(log N) heap operation and fixed capacity.

## Realtime allocation

**VERIFIED.** The allocator test uses linker wrapping for
`malloc/calloc/realloc/free/posix_memalign`, proves the detector with a positive
control, then marks the realtime render window. The acceptance workload reports
zero allocator calls in the callback path.

## Sanitizers

Separate builds were executed:

```text
ASan + UBSan : VERIFIED, 11/11 tests passed
TSan         : VERIFIED, 11/11 tests passed
```

The first new TSan concurrency run found a real publication race: a control
thread initialized a Program slot and released `state=ARMED`, while one render
telemetry loop loaded the state with relaxed ordering and then read non-atomic
Program fields. The state load was changed to acquire ordering. TSan then
passed the complete suite including the concurrent control/render test.

This history is retained because finding such a race is precisely the purpose
of the new concurrency gate.

## Determinism / callback partitioning

Same build, same machine, same seed and timed inputs remain bit-identical across
radically different callback partitions. Current acceptance hashes remain:

```text
unit partition episode: 46da26d8 across 512, ragged, 33, 1024/2048
tool episode          : 0311de02 across uniform, ragged and tiny
```

Cross-platform bit identity is not claimed.

## Offline throughput

Shared render kernel, ragged quantum sequence, 60 seconds rendered offline:

```text
EXPERIMENTAL density 1.85 : ~111x realtime, peak 32 voices, 0 denied
EXPERIMENTAL density 16   : ~14x realtime, peak 255 voices, 0 denied
```

These are workload/headroom observations only. They are not PipeWire latency,
XRun or physical-device claims.

## PipeWire

`src/backends/xen_backend_pipewire.c` and `tools/xen_host.c` are present and use
the same `xen_engine_render()` as the Null backend.

Status in this environment:

```text
source present              : VERIFIED
compiled against PipeWire   : IMPLEMENTED_NOT_EXECUTED
physical device run         : IMPLEMENTED_NOT_EXECUTED
latency / XRuns             : UNKNOWN
```

`libpipewire-0.3` development files are unavailable here. `backend_xruns == 0`
must not be interpreted as proof of zero XRuns; XRun accounting is not yet
implemented.

## Musical semantics

All current sound-generation bodies remain **EXPERIMENTAL / PARITY_NOT_ESTABLISHED**.
The granular generator, Wave-style oscillator body and Forge-like effect are
workloads for the execution substrate. See `MUSICAL_SEMANTICS.md` and
`IMPLANT_BOUNDARY.md`.
