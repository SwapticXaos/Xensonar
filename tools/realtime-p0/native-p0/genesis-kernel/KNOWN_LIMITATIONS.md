# Known limitations

Ordered by how much they matter.

## 1. PipeWire backend: written, never compiled, never run — `IMPLEMENTED_NOT_EXECUTED`

```
compiled:                   NO
physical device validation: NO
```

The current review container has no `libpipewire-0.3` development package and no
physical audio device exposed to this task. `src/backends/xen_backend_pipewire.c` is real code written
against the documented 0.3 API — `pw_thread_loop`, `pw_stream_new_simple`,
`SPA_AUDIO_FORMAT_F32P`, `PW_STREAM_FLAG_RT_PROCESS` — and `tools/xen_host.c`
drives it, but **neither has been through a compiler**. Expect to fix small API
details on first build. Nothing in `EVIDENCE.md` claims otherwise, and
`run_all.sh` prints the backend status on every run.

What is *not* in doubt: the backend calls the same `xen_engine_render()` the
null backend calls. There is no second DSP path to diverge.

**xrun accounting is not implemented.** `backend_xruns` is always 0 and means
"not reported", not "no xruns occurred". Inventing a number from timing guesses
would be fabricated evidence.

## 2. Determinism is single-platform

Bit-identical is claimed only for one binary on one machine. `sin`, `cos` and
`exp` come from libm and differ between implementations; FP contraction is
disabled but ISA differences remain. A cross-platform contract would need an
explicit tolerance and is deliberately not shipped.

## 3. Sub-step grain placement

The generator seam has a per-event `frame` field, but the v1 scheduler
materialises every event returned by a step *at the step frame*. Sub-step
accuracy is available by using a smaller `step_ms` (down to one frame). A
generator that wants to place grains at arbitrary frames within a step needs a
small bounded future list in `xen_program_step()` — deliberately not built
until a real generator needs it.

## 4. Single control thread

The command ring is single-producer. A host with several control threads must
serialise on its own side. Multi-producer would cost an atomic CAS per submit
for no current benefit.

## 5. Token uniqueness is a contract, not enforced

Gesture tokens must be unique within an epoch. The cancel/seen rings are 256
entries; reusing a token inside that window can cancel the wrong attack. The
adapter allocates monotonically. Enforcing it in the engine would need a
token table with eviction semantics of its own.

## 6. Mono assets

Material is mixed to mono on publish. Stereo grain reading is a voice-body
change, not an architectural one.

## 7. Program kinds

Exactly one program kind exists (`XEN_PROGRAM_GRANULAR`). Drone, particle
field, sequencer and modulation programs are not implemented. The slice was
kept deliberately narrow (§15 of the brief); adding a kind is a new `case` in
`xen_program_step()` plus a voice body.

## 8. No transport

Tempo/bar/beat is not implemented. Nothing in the first slice needs it, and
guessing at Xensonar's rhythmic semantics would violate §3.

## 9. Routing is a single bus

One texture+gesture bus → Forge → Master → Recorder. Named buses, per-bus
capture and per-program lanes are in the ABI sketch but not implemented.

## 10. Telemetry snapshots are intentionally non-transactional

Counters are atomics and the snapshot is not a transactional consistent cut: two
fields may come from adjacent blocks. This is acceptable for cold telemetry and
keeps the realtime owner free of snapshot coordination.

## 11. Overload behaviour above the voice ceiling

`xen-bench` shows the pool saturating at 255–512 voices under absurd density
(16 grains/step). Beyond the ceiling grains are denied and counted — no
thinning, no stealing from interactive voices — but the resulting texture is
obviously not what the parameters asked for. That is the intended explicit
failure, not graceful degradation.

## 12. `xen_engine_maintain()` needs the render thread to have run

Program slots and retired assets are reclaimed only after the realtime thread
has acknowledged the death. If an engine is panicked and never rendered again,
the slots are reclaimed by `xen_engine_destroy()` instead.
