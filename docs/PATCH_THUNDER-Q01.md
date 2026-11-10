# THUNDER-Q01: Q-Schalter, neue Keyboard-/Enter-Hold-Gesten starten auf dem nächsten Slot

Der Patch kommt von außen (`XenSonar_THUNDER-Q01_isolated.patch`, Handoff, Manifest, Tests). Er war gegen die gebaute HTML von ROOM4-03c geschrieben (Parent `2e72893d…`). Er wurde nicht per `git apply` auf die HTML gelegt, sondern Hunk für Hunk in die Quelldateien übertragen, weil der Quellbaum inzwischen weiter ist (Merge mit `main`, ROOM4-03d/04/05).

| Hunk | Quelldatei |
|---|---|
| `__xenThunderQ01AttackAtMs`, `Die` (zukünftiger Start), `w4` (Sofort-Attacke überspringen), Pending-Flag | `src/runtime/instrument/09_monitoring_and_manual_patterns.js` |
| `Nie`: lokaler Schritt 0 auch im Sample-Clock-Lookahead | dieselbe Datei |
| `Jxe`: Kandidat für `wellenstart/Enter` und `klaviatur/Keyboard` | `src/audio/05_live_voice_runtime.js` |
| Q-Knopf zwischen Root Reset und Thunder ON/OFF | `src/runtime/instrument/10_entrophon_and_voice_control.js` |
| Werkseinstellung `thunderQuantizeGestureAttack:!1` | `src/rhythm/03_live_drum_bodies.js` |
| CSS `.xen-thunder-quantize` | `styles/areas/028_inline-028.css` |
| Meta-Tag | `src/index.template.html` (der alte Meta-Text „isolated test candidate“ des Patches wurde nicht übernommen) |

Prüfung der Übertragung: alle 31 hinzugefügten Patchzeilen stehen wörtlich im Build; 4 weitere (Q-Knopf, Meta) wurden als eigene Zeilen eingefügt. Einzige Abweichung: Die alte Thunder-Mode-Zeile trug im Patch einen Kommentar-Rest, den die Quelle auf eine eigene Zeile legt, und wurde deshalb unverändert gelassen.

## Prüfung
- Mitgelieferte Tests `Thunder_Q01.tests.cjs` gegen den Build: **10 von 10 grün** (jetzt `tests/thunder_q01_gesture_quantize.cjs`, in `GREEN_NODE_TESTS.txt`; 99 Regressionstests grün).
- `tools/probes/thunder_q_probe.js` in der echten App: Q-Knopf vorhanden, Standard AUS (`aria-checked=false`, Klasse `is-off`), schaltet an und zurück, steht zwischen „Root Reset“ und „ON“, keine Seitenfehler.
- Horizontales Überlaufen bei 390 px (587 px Scrollbreite) besteht unverändert auch ohne den Patch.
- Raum-IV-Probe ohne Fehler. `index.html` +2 037 B gegenüber ROOM4-05 (8 680 100 → 8 683 123 B, inkl. Meta-Zeile).

## Offen (aus dem Handoff, nicht geprüft)
Phasenbezug zum Drum-Transport (Q nutzt den gemeinsamen AudioContext-Ursprung, **nicht** die Drum-Epoche; Hören mit 120 BPM / 24 Slots gegen die Drums steht aus), Sustain/Re-Press, Q-Wechsel während Halten, Tempo-/Slotwechsel, Nodal-Hold/PCM, Persistenz im Session-Roundtrip. Status: CODE_PRESENT, UNIT_VERIFIED (10 Tests), BROWSER_CHECKED (nur Schalter). Nicht: Abhören, Gerät, USER_ACCEPTED.
Rollback: Commit ROOM4-05 (`b7a0216`).
