# XenSonar W31 AF01 → ML01 → KH04 — Factory Keyboard Hold & troodle EQ

Date: 2026-11-08
Status: **QA candidate** — real Firefox/Opera/Chromium musical hearing and interaction still pending.

## Provenance

- Frozen parent: `XenSonar_W31_AF01_ML01_KH03_TROODLE_ARP_3WAY_TEST.html`
  - SHA-256 `0b098642362c692d9f6a08367baa2cd82ae2a653e6986327c30ded2bb5414192`
- Candidate: `XenSonar_W31_AF01_ML01_KH04_FACTORY16_TROODLE_EQ_TEST.html`
  - SHA-256 `0bbe9536dbe77d89feb38382be303dcedf16b8b1d8a6b246bbb0c1dc11440ee0`
- Exact original user-exported EQ: `troodle.eq-pattern.json`; no synthetic EQ values substituted.
- Scope: **script island #11 of 32 only** plus HTML title/metadata. All 77 `<style>` blocks unchanged byte-for-byte.

## Changes

### Keyboard Hold first-run factory demonstration

- The former KH03 comparison row (Donner-Arp/Galopp-Arp/Psy-Spirale) has been removed, along with its special-purpose click handler and label strings.
- The chosen Donner-Arp is now the **unlabelled factory initial condition**: 16 active sixteenth-note slots over exactly 1 bar.
- Original pitch sequence in cents: `[0,386,702,1200,702,386,0,702,1200,702,386,0,702,386,1200,702]`.
- Shared immutable factory definition is copied into the existing starter-song source and the main-room initial fallback. A previously saved session/song overwrites these defaults through the existing owners; the factory demo is **not** an effect continuously forced onto user state.
- The existing Root Reset still zeroes Keyboard/Enter Hold pitch offsets without altering slots, bars, or patterns. Thus the demonstration's arpeggio is gone after Reset but the user's active sixteenth-note rhythm remains editable.
- Existing generic Hold pattern editing buttons remain. Enter Hold is unchanged.

### troodle + exact exported EQ

- Existing built-in `nodal:factory:troodle` and exact factory EQ `eq:factory:troodle@1` remain part of the offline HTML. The built-in factory entry is now labelled **`troodle · Nodal + EQ (Factory)`** in the native Sound picker.
- Selecting this factory sound in the **normal Keyboard sound picker** loads the sound and applies its exact original EQ to the **Keyboard instrument** owner, re-enabling EQ if previously disabled.
- KH03's two separate troodle quick-action buttons were removed because they would be redundant and could imply a separate persistent preset system. It is **one named entry inside the existing sound selector**, not a second UI workflow.
- On a later render with that factory sound selected, if and only if there is **no Keyboard EQ record**, the built-in EQ is hydrated. **Saved or custom-edited EQs, even neutral/disabled ones, are not overwritten.** User-created named EQs remain intact.
- The original immutable EQ pattern remains available in the EQ library, independent of whether local browser storage works. The existing session EQ capture/restore path is not modified.
- Not a guarantee that Firefox's file:// storage persists: when a browser completely erases local state, no user-edited settings can be restored from the HTML alone. Built-in defaults remain available after loss.

## Testing

| Probe | Result |
| --- | --- |
| TDD RED: KH03 parent missing unlabelled 16/1 factory | Fail as intended |
| Native starter-song function executed: 16 steps, 1 bar, original pitch offsets | PASS |
| Both first two slots active | PASS |
| Actual Root Reset handler executed: all cents zero; no other parameters altered | PASS |
| No dedicated comparison buttons/names/handler remain | PASS |
| Actual Keyboard sound picker `onChange` applied factory EQ to `keyboard:instrument` | PASS |
| Factory EQ loaded with `enabled:true` | PASS |
| Factory EQ hydration when Keyboard EQ state missing | PASS |
| Existing edited Keyboard EQ preserved on re-render | PASS |
| Other sounds do not trigger factory EQ | PASS |
| Original exported 360-point A/B curves + 24 manual centers match exactly | PASS |
| Factory EQ remains read-only in the catalog | PASS |
| AF01 Firefox AudioParam simulated regressions | PASS |
| ML01 Melodic Loop and explicit Drum entry regressions | PASS |
| All 32 JavaScript script blocks syntax-checked with Node | PASS |
| All 77 style blocks unchanged from parent | PASS |
| Three deliberate negative mutations (wrong bar size, wrong EQ owner, suppressed hydration) | REJECTED |
| Actual Chromium headless complete launch | NOT VERIFIED (timed out without DOM output) |
| Real Firefox/Opera audio and user-perceived feel | PENDING |

## Targeted user acceptance

1. Open KH04 locally or on Netlify and inspect Thunder Mode → Keyboard-Hold Pattern without loading a prior song. It should start at **16 slots / 1 bar**, all slots enabled, with a musical arpeggio in the pitch rows. There should be no three preset-selection buttons.
2. Hold a keyboard key and listen to the complete pattern at normal BPM. Click **Root Reset**; the pitch variations should disappear, while all 16 rhythmic attacks remain editable.
3. In the normal **Keyboard sound** picker select **troodle · Nodal + EQ (Factory)**, then inspect the Keyboard EQ. The source EQ should be the original uploaded curve. Reload the app to verify host-specific local persistence. A saved, user-edited EQ should not be overwritten by passive restoring.
4. As a regression smoke test, revisit Melodic Loop entry and the audio behavior that formerly triggered the recovery screen.

## Gate

**PROVISIONAL** until the actual browser audio/user workflow is accepted. This candidate should not be described as a fully cross-browser-certified release.
