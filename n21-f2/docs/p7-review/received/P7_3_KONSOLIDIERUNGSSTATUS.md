# XenSonar P7.3 – Spätphase: Status und Abnahmegrenzen

**20. Oktober 2026 · Scope:** letzte Nutzerwünsche zur Forge Navigator UI **plus** fortgeführter Rebase-/Preservation-Audit. Kein neuer Live-Audio-Renderer, kein Worklet-Patch, kein zusätzlicher Timer.

## A. Neu hinzugekommen: ausschließlich Forge Patch 11

- Unsichtbare linke/rechte Resize-Zonen an der **violetten** Carrier-Auswahl. Die cyanfarbene Navigations-/Zoommaske bleibt unabhängig.
- Kleiner **violett-pinker** Vorhör-Playhead durch die geschnittene Auswahl, CSS-Transform über PCM-Vorhördauer.
- Direkt links vom vorhandenen ▶ ein leeres **102 × 25 px** Textfeld, daneben davor **Sample Name:**. Beschriftungsstil/vertikaler Versatz orientieren sich an *Project Name:*. ▶ und Save bleiben geometrisch unverändert.
- Benannter Clip wird tatsächlich unter dem eingegebenen, bereinigten Namen in die Sample Database übernommen. Bei leerem Feld gilt das alte Standardnamensschema.
- Tests: reales Chromium-UI mit Resize, Playhead, Geometrie, Eingabe und Console; VM-Test ruft die echte Sample-Registration mit benanntem, leerem und problematischen Dateinamen auf.

## B. Übergeordnete Konsolidierung, keine erneute Feature-Runde

| Nachweis | Ergebnis |
|---|---|
| Original-Codex-Archiv + zwölf Stufen 00–11 vollständig neu angewandt | **PASS**; Stufenhashes pro Schritt geprüft |
| Finale reproduzierbare HTML (SHA-256) | `efe4338e4459d356f9684949ee85b62f015681cbbcc4950d3bc2f74054d17e84` |
| Historische 00–08-Ancestry + Source Boundary auf **P7.2** | **PASS**; 55 Dateianwendungen / 168 Quellspannen, 216 unveränderte Dateien zu ursprünglicher Codex-Basis |
| Exakte P7.3-Ancestry auf **P7.2** | **PASS**; sieben geänderte/ergänzte Dateien, 58 deklarierte Source-Spans; 233 übrige ursprüngliche Module byteidentisch |
| Neugenerierter `source-index.json` | **PASS**; 6504 Deklarationen / 1113 Modulabhängigkeiten |
| Neuer Forge-Navigator-/Speichertest | **PASS** |
| Bestehende Grid-/Space-Verhaltenstests | **17/17 PASS** |
| Bestehende Core-Smoke-Tests | **10/10 PASS** |
| RFL-Live-Stability-Suite | **PASS** inkl. PCM-Crop, Fallback, Ownership-/Release-Lifecycle |
| Historische gesamte `npm run test:merge` | **ROT**: `tests/nodal-ball-grid-preservation.cjs` verlangt alten Byte-Hash von `src/nodal/07_sound_designer.js` aus der Codex-Basis. Die Datei wurde in Stage 00 *absichtlich* erweitert. Keine inhaltliche Validierung durch diese rote Prüfstelle möglich, bis der Vertrag explizit überarbeitet ist. |

Die ursprüngliche `p7_2_patch_ancestry.cjs` ist **für den P7-Stand** gedacht. Sie wird weiter auf P7.2 angewandt; P7.3 bekommt seine eigene zusätzliche Stage-11-Ancestry. Auf P7.3 direkt angewandt wäre die alte Bytegleichheitsbehauptung irreführend.

## C. Patch 00 bleibt reviewpflichtig

Er ist **keinerlei reine UI-Bereinigung**, sondern enthält Installation Sound On/Off, Ball-/Myzel-Gain und Startdefaults/Effektrack. Die aktuelle Quellgenealogie und die gezielten Ball-Audio-Tests sind grün. Vor einer späteren Übernahme in einen *anderweitig weiterentwickelten Codex-Hauptzweig* muss geprüft werden, ob dort einzelne Funktionen bereits enthalten sind. Keine automatische Doppelübernahme und keine pauschale Änderung historischer Hashes.

## D. Nicht nachgewiesen / nächste echte Abnahme

- Kein direkter Hardware-Hörtest in Opera/PipeWire; visuelle Playhead-Tests sind **keine** Audio-Ausgabemessung.
- Kein Nachweis einer globalen CPU-/Echtzeitperformanceverbesserung durch die Bass-Grid-Splittung; diese ist nur als vorkompilierte, nicht-attackbezogene Arbeit abgesichert.
- Keine neue Regression oder Ersetzung des Original-Refucktor-Audio-Graphen in P7.3; klangrelevanter Ausstieg sollte durch konkreten Hörbefund veranlasst werden.
- Kein vorschneller Rebase auf einen unbekannten aktuelleren Codex-Hauptzweig.

**Freigabeentscheidung:** P7.3 als testfähiges Artefakt zur musikalischen Abnahme. Für Codex später nur der gezielte Review des Preservation-Kontrakts / Stage-00-Überlapps oder ein konkret gemessener Audio-Engpass. Kein erneuter Komplettimplementierungsauftrag.

## Anwendung

`python3 Handoff/apply_patches.py /PFAD/ZU/FRISCH/n21-f2 --to 11` – Originalarchive bleiben unverändert. Das ZIP enthält nur die elf-plus-eins Patchstufen 00–11, Handoff und Tests, **keine volle HTML und keinen vollständigen Source Tree**.
