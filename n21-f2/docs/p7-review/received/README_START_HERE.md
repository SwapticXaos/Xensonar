# P7.5 Addendum – late stabilization (20 Oct 2026)

**Recommended stage: 13**, containing two separate amendments beyond P7.3: **12** momentary keyboard B/Alt expression and OS-key-repeat/pointer ownership; **13** violet selection-edge handles with small triangles in the magnified Spectral Forge main canvas. See [`P7_4_P7_5_KEYBOARD_POINTER_FORGE_HANDOFF.md`](P7_4_P7_5_KEYBOARD_POINTER_FORGE_HANDOFF.md). Run `python3 Handoff/apply_patches.py SOURCE/n21-f2 --to 13` and then `node build.cjs --verify` in the patched source directory.

Latest HTML SHA-256 `05b2fb522db77a5995769815c294f266901b9c81d7d1b498fbbbc2d02a0b5ccc`. No complete sources or HTML in this ZIP. See README below for original Codex source archive and stages 00–11.

---

# P7.3 Addendum – 20 Oct 2026

**Latest stage: 11.** New Forge-only Navigator trim, preview and sample naming refinement. See [P7_3_FORGE_NAVIGATOR_HANDOFF.md](P7_3_FORGE_NAVIGATOR_HANDOFF.md). Original source archive unchanged. Build target SHA-256 `efe4338e4459d356f9684949ee85b62f015681cbbcc4950d3bc2f74054d17e84`. Apply with `--to 11`. P7.2 test/metadata stages 09/10 remain included.

---

# XenSonar – P7 / Codex: modularer Diff-Handoff

**Stand:** 20. Oktober 2026  ·  **Zweck:** Wiederanbindung der Chat-Entwicklung an die konkrete Codex-Quellbasis, ohne Vollquellstand im Paket.

## In drei Sätzen

Diese ZIP enthält **neun einzeln prüfbare Funktionspatches (00–08), die ausschließlich testbezogene Stufe 09 und Stufe 10 für Tests plus Quellindex-Aktualisierung** gegen die **vom Nutzer hier hochgeladene** Datei `XenSonar_N21_F2_Nodal_Ball_Grid_Quellen(1).zip`. Die Patches sind thematisch getrennt, enthalten ausschließlich Änderungsoperationen und kleine Beleg-/Testdateien, **kein vollständiges Projekt, keine gebaute HTML, keine `node_modules`**. Mit `apply_patches.py` wurde ihre Anwendung auf einer frischen Kopie der Quellbasis geprüft: Der Original-Build `node build.cjs` erzeugt exakt die zuletzt bereitgestellte P7-HTML (**SHA-256 identisch**).

## Zielbasis – bitte NICHT mit einer anderen N21-F2-ZIP verwechseln

- Originalarchiv: `XenSonar_N21_F2_Nodal_Ball_Grid_Quellen(1).zip`
- ZIP-SHA-256: `0ef0eb50c84eaa18df4f03fa76959e44a011e6fc6feb1599909cb9cc0bd6e4f5`
- Repo-Unterordner im Archiv: `n21-f2/`
- Vom **unveränderten modularen Quellbaum** gebaute HTML: SHA-256 `e8e63ffe8703fbe3ed683603e880c5e5b8a2970f04cf620e0ed291e98313884d`, 5.608.871 Bytes.
- Ziel: P7-HTML SHA-256 `bc0260682088a3a37a7bf9637d634b8027bc121b2546cb9b520a9760d94c002d`, 5.672.609 Bytes.

## Anwendung durch Codex – auf frischer KOPIE

```bash
unzip 'XenSonar_N21_F2_Nodal_Ball_Grid_Quellen(1).zip' -d ./source-base
python3 ./handoff/apply_patches.py ./source-base/n21-f2 --to 08
python3 ./handoff/tests_verify_final_contract.py \
  ./source-base/n21-f2/XenSonar_Codex_Handoff_Through_08.html
```

`handoff` steht im Beispiel für den entpackten Inhalt **dieser** ZIP. Das Skript benötigt Python 3 und Node.js, aber keine Dritt-Pythonbibliotheken. Originaldateien in `source-base/n21-f2` **vorher separat sichern**; der Runner modifiziert die übergebene Quellbaumkopie. Der ursprüngliche HTML-Build bleibt erhalten; die neue HTML erhält einen eigenen Namen.

Ein Zwischenstand kann gezielt mit `--to 02` oder `--to 05` erzeugt werden. Das ist ein **Präfix der Patchkette**, kein unabhängig auf die Ursprungsbasis anwendbarer Einzelpatch.

## Patchreihenfolge

| Stufe | Thema | Herkunft | Zweck |
|---|---|---|---|
| **00** | `BASE_BRIDGE_UI_CLEANUP` | Codex-Ball-Grid → zwischenzeitliche UI-Cleanup-Basis | **Ausdrücklich ausgewiesener** Vorpatch; nicht Teil des späteren Drone-Designs. |
| **01** | `REFUCKTOR_ORIGINAL_ENGINE` | Drone-Pilot + echte historische Refucktor-Transplantation | Originaler Audio-Graph, Echo-/Kompressorweg, feste Frequenz, Snap; erster approximierender Pilot im endgültigen Resultat ersetzt. |
| **02** | `DRONE_WORKBENCH_WOBBLE` | Drone Workbench P3 | Mute-Pattern, zweites 16er-Wobble-Raster, AudioNode-Modulation, Drive, Flanger, Cursor-Follow. |
| **03** | `BASS_GRID_DERIVED_AND_LIVE` | Bass-Grid P1/P2 | Ableitung vom Haupt-Grid, Mutes/Offsets, vorberechnete Bass-Tonhöhen, gemeinsame Library. |
| **04** | `BASS_GRID_UI_DRONE_RFL` | Bass-Grid P3 | Rechts oben überlagerndes UI, Intervall-Hover `~5th`, Vorschau, unabhängige Zuordnung Bass/Drone/RFL. |
| **05** | `LINKED_INDEPENDENT_TUNING` | Bass-Grid P4 | „Link to Other Grid“ (Active Selection/Library), für fremdes Grid nur Mutes, keine zweite Cent-Offset-Ebene. |
| **06** | `POWER_ECHO_PERSISTENCE_FORGE` | P5 | Drone-Persistenz, Power/Echo-Gate, Grid→Cursor-Follow, Forge-Auswahlregion ▶ Preview, verständlichere Hover. |
| **07** | `SPACE_KEYBOARD_DETACH` | P6 | Space hält Bass-/Drone-/RFL-Root bei weiterlaufender Keyboard-Melodie; nächster gültiger Input koppelt wieder an; Legende. |
| **08** | `KEYBOARD_EXPRESSION_AND_HOVERS` | P7 | B anschwellende Keyboard-Anschlagsdynamik, linkes Alt abdämpfend, englische Hotkey-/Status-Hover; AltGr unverändert. |

**00 ist eine echte Basiskorrektur.** Der erste hier entwickelte Drone-Pilot baute auf einer HTML namens `Nodal_Installation_UI_Cleanup_Test` auf, wohingegen das neue Codex-Archiv `Nodal_Ball_Grid` enthält. Die Differenz wurde separat isoliert, damit Codex sie explizit reviewen kann. Sie umfasst u. a. Nodal/UI- und weitere Quellmodule. Sie darf weder unbemerkt mit Patch 01 verschmelzen noch ohne Prüfung im Codex-Hauptzweig übernommen werden.

## Was ist ein `.xpatch.json`?

Die zugrunde liegende HTML enthält teilweise extrem lange/minifizierte Zeilen. Gewöhnliche Unified-Diffs hätten dadurch ganze große Module oder Millionen Zeichen kopiert – das wäre praktisch wieder ein Vollquellstand. Die **quellmodulbasierten Span-Diffs** referenzieren stattdessen pro Datei die exakte Vorher-/Nachher-SHA-256 und eine geordnete Liste von Unicode-Zeichenbereichen (`at`, `delete`, `insert`). `apply_patches.py` wendet sie rückwärts nach Offset an und verweigert jede unpassende Quellbasis; **kein Fuzzy-Patching** und kein stiller Dreiwege-Merge.

Die Zwischenstufen enthalten die *jeweilige Änderung seit der unmittelbar vorangehenden Stufe*. Für menschliche Review siehe `HANDOFF_TECHNIK_UND_TESTS.md`, `evidence/STAGES_AND_MODULES.json` und die kleine Donor-Funktionenreferenz in `evidence/donor_excerpt/`.

**Git/Codex-Empfehlung:** Nach verifiziertem Wiederaufbau die geänderten modularen Quellen mit `git diff` im bestehenden Codex-Repo reviewen und thematisch committen. **P7.2 aktualisiert `source-index.json` in Stufe 10 und prüft ihn reproduzierbar.** Historische Preservation-Baselines bleiben absichtlich unverändert und müssen nach fachlichem Review neu spezifiziert werden; nicht blind die Hashwerte überschreiben.

## Prüfung

Ursprünglicher P7-Handoff: 9/9 funktionale Patchstufen rekonstruiert (P7.1 ergänzt danach separat eine geprüfte Teststufe 09), jeweils HTML-Hash exakt; finaler Build und `node build.cjs --verify` erfolgreich; JavaScript-Modul `node --check` erfolgreich; 13 strukturelle Merkmale geprüft; RFL-Live-Stability-Suite bestanden. **Die bestehende `npm run test:merge` schlägt erwartungsgemäß an einem alten Erhaltungshash für `src/nodal/07_sound_designer.js` fehl** – kein Nachweis eines Laufzeitdefekts, aber ein echtes noch offenes Baseline-Gate. Keine Behauptung eines neuen Opera-Hörtests oder aktueller PCM-Gleichheit durch dieses Paket.


## P7.1 – optionale Test-/Konsolidierungsstufe 09 (20.10.2026)

Jetzt kann `--to 09` verwendet werden. Diese Stufe fügt **nur drei eigenständige Tests** hinzu und ändert keinen einzigen Audio-/UI-Quelltext; die finale HTML-Prüfsumme bleibt exakt gleich wie P7. Siehe `P7_1_KONSOLIDIERUNGSBERICHT.md` für Testbefehle und Einschränkungen. `npm run test:merge` ist durch den älteren Preservation-Hash nach P7 noch nicht grün.


## P7.2 – Phase der späten Konsolidierung (20.10.2026)

**Aktuell empfohlener Stand: `--to 10`.** Zusätzlich zu 00–09 werden drei neue Regressionstests sowie ausschließlich `source-index.json` als versionierte Metadatenänderung eingespielt. Kein Audio-/UI-Patch, P7-HTML SHA256 identisch.

**Lies zuerst:** [`P7_2_STABILISIERUNG_BERICHT.md`](P7_2_STABILISIERUNG_BERICHT.md). Der Bericht unterscheidet neue positive Testergebnisse, weiterhin rote historische Preservation-Hashes und nicht durchgeführte Opera-Hörtests.


## P7.7 incremental stage 14

Apply stages 00 through 14. Stage 14 toggles B + Left Alt between momentary PEDAL and latched KNOB expression modes. See `Handoff/P7_6_EXPRESSION_MODES.md`. No other functions changed.


## P7.7 new stage
Apply stage `15` after `14`. Restores independent Keyboard Entrophon with Wave Starter OFF. See `P7_7_KEYBOARD_ENTROPHON_FIX.md`.


## P7.8 stage 16–17
Stage 16: visual grid release/black Wave Starter ball. Stage 17: independent recorder **Enough!** / **×** and fullscreen. See `P7_8_POINTER_RECORDER.md`. Apply `--to 17`.


## P7.10 – Aktueller Test- und Handoff-Stand

**Aktuell: ``python3 apply_patches.py /path/to/unpacked/n21-f2 --to 21``.**
Die Patchkette reicht von **00 bis 21**. Stage 18: Sample-Database-Rays; Stage 19: Melodic-Navigator Pointermove; Stage 20: gespeichertes Entrophon-Preset mit alter Live-Revision; Stage 21: von Power unabhängiges Material-Track-Preview für gerenderte Audiodateien.

Siehe **P7_10_ENTROPHON_MATERIAL_HANDOFF.md**. Die neue Test-HTML wird separat geliefert, nicht innerhalb dieses ZIP-Archivs. Alte Einträge dieses README beschreiben historische Zwischenstände.
