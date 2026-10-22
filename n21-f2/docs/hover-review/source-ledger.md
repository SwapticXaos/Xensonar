# Source review ledger

Actual starting HEAD: `10178acb733db38f1801b263ac5200d98c17e69b`, branch `codex/granular-sample-hold`. The historical `e3568a8` label is unavailable locally. All 15 modified existing source-patch blobs matched their declared old Git blob IDs, and the unchanged starting HTML matched the handoff's P7.24 SHA. This establishes applicability by content rather than the historical commit label.

| Stage | Decision | Evidence / limitation |
| --- | --- | --- |
| P7.24 | Preserve | Original saved Entrophon admission, volume and telemetry changes are present in the matching base and retained. No worklet/PCM synthesis rewrite. |
| P7.25–P7.30 | Adopt, correct transaction history | Sessions reference collections, editor/live separation, Save/Quick/Engage and original library ownership retained. Corrected settings Undo and Engage compensation; see integrity test below. |
| P7.31–P7.33 | Adopt net final state | Latest navigation, native library links and modal ownership retained. Historical cumulative alternatives were not applied sequentially. |
| P7.34–P7.35 F1 | Adopt visual/material status; reject obsolete grid algorithm | Material preview retains the real PCM owner and completion status. Library violet and audio readiness retained. No 23-note cap. |
| P7.35 F2 | Adopt pitches and fixed Bowed Glass voice | Full saved tuning period, including nonoctave period endpoint. Existing keyboard/live sound is not selected by preview. |
| P7.36 | Reject timer/lookahead scheduling | Replaced historically by P7.37. No omission-on-stall scheduler reintroduced. |
| P7.37 Rhythm | Adopt | Fresh modular build exactly matched SHA `18445166e19116b2267cbdaf42ab2e0a0478bed951838e37d9cc87f1338cfc86`; buffered audio contract passed. One offline-rendered PCM buffer, 155 ms sample-clock attacks, scoped stop/render token guard. |
| Profiles / first Period Workbench | Adopt semantics; replace first UI with latest | Tile `instanceId` differs from tuning `id`; independent main/bass configuration and clone identity. Initial orange-marker workbench was not restored. |
| Native Workbench correction | Adopt | Shared native pitch marker rack and tuning-mode policy, independent Bass Grid drafts. No second tuning or Bass Grid library. |
| Hover / Boot Guard | Adopt, modularize | Exact source port first reproduced latest reference SHA `35406409a61e3cbe8d989490b2f8dedd95ac2934205248f1873f643a1219d9bb`. Profiles CSS and early startup observer are then moved into bounded manifest head extensions. Observer disconnects at 9 seconds, retains at most 50 long tasks. No speed, crash or hardware claim. |
| Source corrections after reference | Correct | Native grid choose/reset is bypassed for profile activation. Room setting/name/identity history is restored by Undo/Redo. Engage compensates Quick and room changes when the final Session storage or room owner rejects the operation. Errors stay visible; no failed operation publishes an Engaged palette. |
| Retired Song Projects | Preserve access | Original source/styles/storage remain intact. Visible **P7.24 Songs** chooser exposes saved/draft Song → Part hierarchy, explicit one-Part copy into a Session, provenance-based duplicate prevention and exact raw JSON export. No automatic Engage or hierarchy flattening. |
| RFL / Drums / Bass audition | Separate native owner integration | Implemented by the audition workstream; consult its tests and evidence. |

`node tests/p738-session-integrity.cjs` covers same-tuning 19 EDO A→B→A, independent mode/main/bass mutes, unchanged global Bass Grid persistence, draft/live isolation, settings Undo/Redo, failed second-store write, rejected room setter, absent false Engage notification, clone variation without original/twin mutation, orphan cleanup on failed Session save, and saved/draft legacy access plus store recreation and idempotence. The reference mode accepts `P738_REFERENCE_HTML` and optional `P738_FOCUS=undo` / `rollback`; its three failure logs and corrected pass are in `results/sessions-reviewed/source-review/`.

`node tests/p738-session-reload-browser.cjs` independently verifies native HTTPS-origin localStorage reload from v1 to v2, retained v1 originals/colors, actual mounted Main Room 19 EDO A→B→A profiles, native custom-tuning clone/edit without original-library or live mutation, BP-derived custom mode policy, and the visible saved/draft Part importer with reload/idempotence. Evidence: `results/sessions-reviewed/source-review/origin-reload.json`.

`node tests/p738-native-layout-browser.cjs` verifies native Meta/profile/Bass/Period dialog bounds at 1490 and 720 pixels, grouped Bass controls and 19 shared native left-facing pitch markers, first visible dock geometry, resize, a room round trip and actual headless fullscreen enter/exit. `native-layout.json` and two screenshots record the results; the 720-pixel screenshot was visually inspected. This does not establish a fix for the reported intermittent Opera fullscreen overflow.

Engage uses validated snapshots and compensating restoration across existing owners. It cannot provide a browser database transaction across separate localStorage keys and React/external stores. A persistent failure during restoration is reported as **Restore failed**. Hardware playback, Opera/PipeWire, multi-tab pressure, fullscreen recurrence and long-run crash behavior require separate validation.
