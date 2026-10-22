# Sessions library Play adapters

The Sessions library tabs for Root Follow Loop, Drums and Bass now have working independent Play controls. Clicking Play stops the former audition, and Stop also cancels preparation. Row pointer/keyboard events do not add collection tiles or start a drag. The collection tiles retain their previous Grid/Material-only audition controls.

## Original owners and lifecycle

- **Root Follow Loop:** the actual native `fle` button labelled `Preview` / `Stop` (`data-xensonar-root-follow-preview-button`) calls the `gle` property `onRootFollowPreviewToggle`, supplied by `lge` from `bge`'s callback `R`. Sessions invokes this same callback with an optional entry reference and ownership token. `R` readies audio through the existing `ensurePreviewAudioReady`, opens the existing `Pl` preview gate, and temporarily selects the requested bank entry. The existing app uses `nexusActive: Gr || Pl`, so Power can remain off. `ICe → fSe → dSe` uses the existing RFL runtime refs, granular settings, tuning/root policy, rhythm/Forge routes and native rendering. There is no new RFL decoder, source-PCM player or second RFL engine.
- **Drums:** the existing original playlist and exported records supply the requested pattern; `z$` performs the existing offline drum-only rendering (`_$ → O$ → D9`) with marked segments, layers, step probability/locks and existing raw sample-lane decoding/blending. The native drum rack processes the audition bus. Missing sample references fail visibly instead of silently dropping a lane.
- **Bass:** `Gle` resolves a real preset or `eH/Pr` resolves a saved clip. `lce` supplies the original event timing, note lengths, ties, glide and ghost/accent details. Every pitch is resolved by the real Bass Grid at click time, before awaiting rendering. `OPe` supplies its unchanged synthesis body through optional quantizer/destination inputs; ordinary live callers retain their original defaults. A private offline panner captures the current Bass placement.

`__XenMetaAudition` is the shared generation owner with idle/preparing/playing/failed states. Old generations cannot publish readiness or start playback. Drums/Bass use one disposable live BufferSource each. RFL reports preparation until the native clock reaches its original next-bar start; the existing manager Preview loops until Stop. Its decode/render failures and a 20-second preparation bound fail visibly.

RFL intentionally shares its native Preview semantics: Play temporarily owns the live RFL selection, active flag and resonance mode. Stop restores these fields while they still belong to that audition. A manual selection/mode change is preserved. It does not Engage a Session, alter Quick Access, save or rewrite a song, change tuning, or overwrite the stored Bass Grid. Drums and Bass auditions do not change live selections or transport.

## Native validation

Run from the repository root:

```sh
node build.cjs
node tests/hover-review/session-auditions/native-browser.cjs
```

Evidence is written under `results/sessions-reviewed/session-auditions/`. The Chromium test measures actual final-output PCM for all three kinds with instrument Power off; checks saved sample-only drum timing/full three-bar duration; compares the prechange/default `OPe` native PCM exactly; observes actual 19-EDO oscillator pitch from a saved three-bar, seven-step Bass clip across a concurrent live grid change; exercises Stop, switching, queued native-start cancellation, unavailable references, native readiness failure, natural Drum/Bass endings and pointer controls; and checks restored live state. The test's injected probes are absent from production.
