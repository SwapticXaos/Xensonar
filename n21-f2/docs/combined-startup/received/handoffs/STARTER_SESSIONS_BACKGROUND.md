# XenSonar P7.38.11 — Starter Sessions and Color Contrast

**Base:** `XenSonar_P7_38_10_English_UI_Hovers_Test.html`  
**Deliverable:** `XenSonar_P7_38_11_Starter_Sessions_Test.html`  
**Patch:** `XenSonar_P7_38_10_to_P7_38_11_Starter_Sessions.patch` (gzip also supplied)

## Intended behavior

On a first XenSonar load in a genuinely unused browser storage context, install exactly two ordinary v2 Meta Sessions; do not reseed or overwrite any existing XenSonar browser data. Starter 01 (`01 · Three Minor Worlds`) is loaded into Quickrack; Starter 02 (`02 · Alternate Rhythms`) is available in Meta Menu. Reuse the existing Meta Session store, native Quickrack references, grid profile activation and session color system.

### Starter 01 — Three Minor Worlds

* Grid: 12-EDO Aeolian; JI Harmonic Minor (native chromatic JI with explicit per-degree mutes); BP Moll.
* Drums: Broken Lilt, Four on the Floor, RhythmForge Fractured.
* Bass: RhythmForge Fractured, PsyBass Classic Offbeat, PsyBass Rolling.
* Material Track and RFL: Random Demo variants A, B, C rendered as real material-library package entries. Entries reference the same three exported loops, not six independent audio files. One-time rendering occurs sequentially on idle after boot and after the real adapters are registered; pending state is durable. Both playback lanes explicitly default to muted on this first install.
* **Color contract:** All three cards of each column have exactly one shared background color. Borders are individually colored. Grid is blue-based, drums warm-brown, bass green; all Material cards share an indigo-blue ground, all Root Follow cards share a violet ground.

### Starter 02 — Alternate Rhythms

* Grid: 19-EDO Phrygian and 31-EDO Dorian.
* Drums: Breakbeat and Minimal HiHat.
* Bass: PsyBass Dark Forest and PsyBass Gallop.
* Material and RFL: empty.
* **Color contract (user follow-up):** All six cards have *different* and deliberately irregular, striking background hues with independent contrasting border colors. No repeated per-column background. The palette is deterministic (not randomized on every boot). Dark-enough saturated shades preserve text readability.

## Key constraints

1. A first-install guard checks storage before other initializers can write it. Any pre-existing `xensonar...` key blocks seeding. Storage read errors are not treated as a new browser.
2. Do not modify the original builtin drum, bass or tuning libraries. Session references store preset IDs; distinct grid instance IDs retain separate mute profiles.
3. Never render three audio examples simultaneously or during the synchronous startup critical path.
4. Existing sessions and user data must never be overwritten. The `pending` key is for the initially installed demo-render process only.
5. Audio/rhythm engine and scheduler logic are untouched. Existing time signatures and per-lane session behavior remain unchanged.

## Verification performed

- JavaScript syntax: both inline script blocks pass `node --check`.
- Unit data test: primary per-column backgrounds uniform and borders unique; secondary all six backgrounds unique and white-text contrast > 4.5; demo lane entries reuse their respective column backgrounds.
- Source presence/static invariants for first-boot gate, presets, stage A/B/C, muted playback flags and idle render.
- Unified patch can be applied back to P7.38.10; SHA-256 of the reconstructed output matches the delivered HTML byte-for-byte.

**Not verified:** actual interactive browser runtime and first-run loop renders. A headless Chromium attempt returned `net::ERR_BLOCKED_BY_ADMINISTRATOR` when opening the local HTML. That is an environmental restriction, not evidence the session runtime works. Check in a truly clean browser profile before accepting the build: both starter Meta Sessions, 3+3+3+3+3 Quickrack entries after hydration, mute state, selecting each mode, the alternate palette and reloading without duplication. On an existing browser, confirm that no starter is added.
