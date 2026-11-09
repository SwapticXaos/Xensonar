# XenSonar W31 — Milestone Integration / Audit

**Datum:** 2026-11-08  
**Status:** KONSOLIDIERTER ENTWICKLUNGSSTAND, `QA_PENDING`. Keine Behauptung einer vollständigen Audiohardware-, Browserprofil- oder 120-Minuten-Abnahme.

## Herkunft und Identität

- Hauptquelle für diesen Merge: `XenSonar_W30C_MRU01_FF01_FLAC_SECURITY_FALLBACK_QA_PENDING.html` — SHA-256 `a252a013aca5083a52f3c2e6ee3e3373cca381eb4be2320d7da8302e3104b13d`.
- Zusammengeführte HTML: `XenSonar_W31_MILESTONE_INTEGRATED_QA_PENDING.html` — SHA-256 `53b9d3f4639176037ecd7d646c15c95ea5cdae91932df04a655cc8249c626dc3` (8,512,444 Bytes).
- Isolierter Integration-Diff: `XenSonar_W31_MILESTONE_INTEGRATION.patch` — SHA-256 `2360345a3adb5a09d35de5815e908329bdc0fe44dad3632e206934e40313fa38`.
- Der Patch rekonstruiert die finale HTML vom exakten FF01-Parent **bytegenau** (`patch --fuzz=0`) und wird bei doppelter Anwendung abgewiesen.
- Sonstige Quellen: W30C ED1 → TD02 → RFL01; W30C ED1 → LM01 → GM01 → VG01; ED1 → LM01 → MRU01 P1–P6 → FF01.
- Quell- und Arbeitsdateien blieben unverändert. 32 Inline-JavaScript-Blöcke und 77 Stylesheets sind im neuen Milestone enthalten; gegenüber MRU01/FF01 wurden **nur die Scripts 10, 15 und 19** geändert, keine Styles. Hinzu kommen die Korrektur der Download-Beschriftung sowie HTML-Titel und Milestone-Metadaten.

## Enthaltene Funktionen

- ED1: 18 Drum-Kits, gespeicherte Drumbeat-Parameter/EQs und Paketstation.
- TD02: Entfernen des obsoleten Start-Upgrades, Hydration-Backoff bei permanentem SecurityError sowie Wave-Editor-Korrekturen (leere Copy/Trim, No-op Publish etc.).
- Root-Follow Smooth Entry 01: Zeitliche Einblendung ab erstem geplanten Klangfenster; Quick Preview unverändert.
- LM01/MRU01 P1–P6: Long Master Recording mit 4-MiB-Rohblöcken in IndexedDB; 1 zusammenhängender WAV/FLAC-Export, 16-/24-Bit-FLAC, Vorschau, Crop.
- FF01: OPFS-SecurityError-Fallback auf temporäre IndexedDB-Ausgabe. Nutzer hat den reparierten FLAC-Export im eigenen Browser erfolgreich gemeldet.
- GM01: Golden Move & Mix inklusive sparse Undo/Redo, projektpersistenter History.
- VG01: Wiedergabe-VOL außerhalb, Audio-GAIN innerhalb des Wave Editors; Copy-Snapshot vor späterem Gain bleibt konstant.
- Exportbedienung: Der einzige Master-Recorder-Button heißt **„⤓ Download“**, der Tooltip benennt dynamisch das aktive WAV-/FLAC-Format und Full/Crop. Export-Routing wurde nicht geändert.

## Wiederholte Prüfungen nach der Integration

| Nachweis | Ergebnis |
|---|---|
| Alle Inline-Skripte als Module / Classic parsen | **32/32 PASS** |
| GM01 echter PCM-Core, inkl. 500 randomisierte Sample-Verschiebungen | **15/15 PASS** |
| GM01 Chromium-UI (Greifen, Doppelklick, Golden, Undo/Redo, Zoom, Channel) | **10/10 PASS** |
| VG01 PCM-/Controller-Tests | **8/8 PASS** |
| VG01 Chromium Editor-Integration (Copy → Gain → Mixpaste, Insert, Undo usw.) | **10/10 PASS** |
| VOL/GAIN SVG-DOM, Tastaturgeste, Labels | **PASS** |
| MRU01 Storage, WAV/FLAC, Peak-Overview, Crop | **16/16 PASS** |
| FF01 SecurityError-Fallback Node + echte FLAC-Dekodierung mit simulierten Browser-APIs | **8/8 PASS** |
| TD02 Copy/Trim Guard im echten W31 PCM-Core | **3/3 PASS** |
| RFL Gate Helper und nur erste Entry-Attack | **PASS** |
| RFL OfflineAudioContext: Nullsprung an harter Eintrittskante, normaler Pegel erhalten | **PASS** |
| 90 Legacy-Drum-Voices identisch; 18 neue Voices vorhanden | **PASS** |
| Drumbeat-Owner/EQ-Priorität | **8/8 PASS** |
| Paketstation Working-Session-Flush | **4/4 PASS** |
| Standard-`patch --fuzz=0` auf FF01-Parent reproduziert identisches W31 | **PASS** |
| Weiterer Patch-Anlauf abgewiesen | **PASS** |

## Adversarialer Abgleich

- **Falsche Beschriftung nach Auswahl FLAC24:** Der FF01-Ausgangsstand hat `Download WAV`; W31 zeigt unabhängig vom Format `Download`. Die Aktion selbst verwendet bereits `f319DownloadFlac` mit 16-/24-Bit-Auswahl und `downloadLongSessionPart` für WAV. Der Tooltip folgt dem Format.
- **Verlust bereits stabilisierter Wave-Editor-Aktionen:** W31 wurde als 3-way-Integration gegen den gemeinsamen ED1-Core aufgebaut. TD02-Caret-Schutz, GM01-Move-Mix und VG01-Gain-Pfade laufen im gleichen finalen Script 15 und bestehen gemeinsam ihre Tests.
- **Root Follow knackt beim physischen Betreten:** Unveränderte RFL-Entry-Hilfe und reale OfflineAudioContext-Probe bestehen; dies ist kein Echtzeit-/Hardwarebeweis.
- **FLAC scheitert wieder an OPFS:** der W31-Exporter enthält FF01 unverändert. 8 simulierte Fehlerpfadtests bestanden; erneuter Chromium-`localhost`-E2E-Test wurde durch `ERR_BLOCKED_BY_ADMINISTRATOR` der Werkzeugumgebung verhindert. **Der tatsächliche Nutzererfolg ist die verfügbare Live-Beobachtung**, keine 2-h-Langzeitgarantie.
- **Neue Drums durch Hauptscript-Merge verloren:** Über 90/18-Rezeptvergleich und 8/8 Beat Owner Tests ausgeschlossen.

## Explizit offene Punkte

1. **MRU01 P7** ist noch nicht umgesetzt: alter 15-Minuten-Recorder und Umschalter bestehen vorläufig parallel weiter. Das vermeidet ungeprüfte Funktionsverluste; es ist noch *kein* vollständig vereinheitlichter Recorder.
2. **P8**: 15/30/60/120-minütige reale Aufnahmeläufe inklusive Browserquota, Dateidownload und Sample-Integrität fehlen. User-bestätigter FLAC-Export betrifft eine Aufnahme, nicht 2 Stunden.
3. Die gesamte 8-MB-Anwendung konnte hier nicht als echte `file://`-Browser-Sitzung mit Persistenz gestartet werden; Chromium-Prüfungen nutzen echte Funktions-/DOM-Ausschnitte.
4. Die FF01-Ausweichroute kann bei sehr großen FLAC-Dateien zusätzliche Platten-/Speicherlast erzeugen. Ursprungsdaten bleiben unabhängig davon erhalten.

**Urteil: `W31 CONSOLIDATED / INTEGRATION QA_PENDING` — als neuer Arbeitsmilestone geeignet.** Kein Überschreiben oder Löschen von ED1, TD02, RFL, GM01, VG01, MRU01 oder FF01. Für Browser-Langzeit-/Audio-Hardwareabnahme bleibt ein QA-Gate offen.
