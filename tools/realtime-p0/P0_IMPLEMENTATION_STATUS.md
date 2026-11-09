# P0-W Status — 326-audit1, 2026-09-21

**Source-/Modell-PASS. Reale W-G1/W-G2- und Geräte-/Callback-Abnahme offen.**

Der DSP, das Synthese-Worklet und der Kontrollclient bleiben auf `p0-w/325-audit1`. Dessen implementierte Fähigkeiten und Begrenzungen stehen in `ASTRA_325_P0W_AUDIT.md`. Das Aufnahmeprotokoll wurde wegen korrigierter Ownership-/Integritätsregeln auf `p0-pcm-tap/326-audit1` gesetzt.

Neu verifiziert: 21 gezielte Tap-/Client-/Oracle-/Exportfälle, echte ArrayBuffer-Transfers in Node, unveränderte bisherige Core-/Safetytests und 26 bytegleiche geschützte Dateien. Die 100/250/500-ms-Modellstalls ergeben identische Samples. Das ist kein Browser-/Gerätenachweis.

Die Baseline und normalen Takes werden gegen das gleiche eingefrorene Programm und untereinander geprüft; stumme oder widersprüchliche Takes bestehen nicht. Recorderüberlauf wird durch ausbleibende Buffer-Rückgaben bei weiterlaufenden Heartbeats erzeugt. Die 1500-ms-Lease bleibt unverändert. Der überlaufene Take ist ausdrücklich lückenhaft. Ein echter 1800-ms-UI-Stall wäre eine getrennte Lease-/Stop-Prüfung.

Reales Messrouting und Rohdatenexport sind implementiert und für den externen Lauf vorbereitet. Der direkte primäre Audiopfad wird durch einen parallelen, stummen Recorderzweig ergänzt. Browser-Processorfehler, echte Audio-Callbackkosten, Ausgabetimestamps und der tatsächliche Ausgang müssen noch geprüft werden.

Offen bleiben kontinuierlicher Program-Root für bereits laufende Stimmen, atomarer Next-Bar-Patternwechsel, 108-BPM-Langlauf, vollständiger v0.2-Adapter, Geräte-/Suspend-/Restartprofile, Soak, native Realtimeausgabe und musikalische Beurteilung. Der native Smoke ist weiterhin eine Offline-Fixture.

Die Projekt-Provenienzprüfung besteht mit drei Warnungen. Historische Runtime-/Scope-Guards bleiben rot; sie wurden nicht neu kalibriert. Ihre Overlay-Ergebnisse sind unter `artifacts/ASTRA_326_*GATE*.json` und `ASTRA_326_LEGACY_*GUARD.json` dokumentiert.

Verbindliche Folgearbeit: `ASTRA_326_NEXT_STEPS_AND_SOL_HANDOFF.md`. Ursprüngliche Sol-326-Berichte sind unter `artifacts/original-sol-326/` archiviert.
