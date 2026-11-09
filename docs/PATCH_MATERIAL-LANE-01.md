# MATERIAL-LANE-01: Spurkette für zwei Taktgeber vorbereitet (R3, R1, R2)

Grundlage: `docs/MEHRSPURRAUM_SPURKETTE_STUDIE_2026-11-09.md`. Drei getrennte Commits, gemeinsam ausgeliefert.

| | |
|---|---|
| Basis | LIVEZONE-02 (USER_ACCEPTED), `index.html` 8 563 535 Bytes, SHA-256 `089349a9b460c1c2761b58e576fe968bd18f268373ea32c610d8fd45f90959cd` |
| Ergebnis | `index.html` 8 564 693 Bytes, SHA-256 `351f46c064f404c02a11a3ecaff4fcb79c2c333aeeaa2f67b90cd384124b2c8f` |
| Größenzuwachs | +1 158 Bytes (R3 +366, R1 +545, R2 +247) |
| Zone | R3: Raumwechsel/Kontext-Lebenszyklus. **R1/R2: HEISS · Steuerung** (Aufbau der Materialspur beim Start, Regler-Bindungen). Pro Audioblock, Tick oder Reglerbewegung läuft nichts Neues; geändert ist nur, *wo* derselbe Code steht. |
| Daten-Owner | Unverändert: `__XenMaterialVoiceMix` (Live-Instanz, Song Save/`restoreSession`), `__XenEQ` (Schlüssel `material:<id>`), `__XenPan`. Neu: Fabrik `__xenCreateMaterialVoiceMix()`, Kettenbauer `__xenMaterialLaneChain()`, Raumliste `__xenRoomsUsingLiveContext` (leer). |
| Status | CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium). Nicht: Abhören, Gerätetest, Firefox/Safari, USER_ACCEPTED, Netlify. |

## Änderungen

- **R3** (`551bee0`), `src/forge/editor/07_view_lifecycle.js`, `src/app/forge/01_room_shell.js`: `__xenRoomUsesLiveContext(room)`. Der Schlafmodus (LIVEZONE-02) hält den Live-Kontext nicht an, wenn der Zielraum ihn beansprucht. Heute beansprucht ihn kein Raum; Raum IV trägt sich später ein.
- **R1** (`c9cd661`), `src/audio/01_voice_and_rfl_ownership.js`: `__xenMaterialLaneChain(ctx,{source,pitchNode,gain,panValue,onPan,eqKey,route})` übernimmt aus `$fe` die Stufe Quelle → Pitch → Gain → Pan → EQ → Route. Gleiche Reihenfolge, gleiche Startwerte; Live übergibt `eqKey=keyFor('material',id)`, die Pan-Bindung und das bisherige Routing (Rhythmus-Bus, Myzel-Router, Forge-Send).
- **R2** (`4d83383`), `src/mix/03_quick_menu__before_eq-core.js`, `src/audio/01_voice_and_rfl_ownership.js`: `__XenMaterialVoiceMix` wird von `__xenCreateMaterialVoiceMix()` erzeugt (Inhalt unverändert). `__xenBindMaterialPitch/Pan` nehmen optional eine Instanz (Standard: Live).

Diff gegen die Basis: nur Script-Block 12; 32 Scripts / 77 Styles; Syntax wie Basis.

## Prüfungen

Neue Probe `node tools/probes/material_chain_probe.js [html]`: importiert eine erzeugte Test-WAV über SpectralForge → „Send raw as a loop to Material Track“, schaltet Power an, verfolgt die Kette hinter dem Phasen-Worklet und misst den Pegel am Spurausgang. Pan- und Pitch-Regler der Spur werden per Mausklick bewegt.

| Stand | Kette | Pan-Regler → StereoPanner | Pitch-Regler → Worklet | RMS Spitze / Mittel |
|---|---|---|---|---|
| R3 (vor R1) | phase → pitch → gain → pan → gain → EQ … | 0 → 0,89 / 0,89 | – | 0,0443 / 0,0195 |
| R1 | **identisch** | 0 → 0,89 / 0,89 | 0 → 55,4 / 55,4 Cent | 0,0443–0,0486 / 0,0178–0,0194 |
| R2 | **identisch** | 0 → 0,89 / 0,89 | 0 → 55,4 / 55,4 Cent | 0,0464–0,0482 / 0,0167–0,0205 |

Pegelschwankung zwischen Läufen ±10 %, auch innerhalb desselben Stands; sie kommt von der Messung in 100-ms-Fenstern bei frei laufender Startphase.

`livezone_probe.js` auf dem Ergebnis: alle 13 Schritte wie bei LIVEZONE-02 (Forge `suspended`, Rückkehr `running`, Rückfragen bei Aufnahme). Keine Seitenfehler.

**Nicht geprüft:** Nudge-Regler (Code-Pfad `registerTransport` unverändert, nur in der Instanz), Song Save/Restore der Spurwerte (Live-Instanz unverändert), zweite und dritte Materialspur, Abhören.

## Offene Risiken

- R1 liegt im Startpfad der Live-Materialspur. Strukturgleichheit und Pegel sind gemessen, das Klangbild nicht. Bitte abhören: Materialspur mit Pitch, Pan, Nudge und EQ, auch mit drei Spuren gleichzeitig.
- `__XenNudgeFeedback` und die Pitch-Diagnose schlüsseln weiter global nach ID. Raum IV muss Clip-IDs verwenden, die sich nicht mit Material-IDs überschneiden.

## Rückweg

LIVEZONE-02 (`089349a9…59cd`). Im Quellbaum: Commits `551bee0`, `c9cd661`, `4d83383` zurücknehmen, `python3 tools/build.py`.
