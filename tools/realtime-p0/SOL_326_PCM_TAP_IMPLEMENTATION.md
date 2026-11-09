# Sol 326 — Status nach Astra-Audit vom 2026-09-21

Der ursprüngliche Sol-Bericht ist unverändert unter `artifacts/original-sol-326/SOL_326_PCM_TAP_IMPLEMENTATION.md` archiviert. Er beschreibt den Stand vor den sieben reproduzierten Gegenbeispielen und gilt nicht als aktuelle Abnahme.

Der korrigierte Stand 326-audit1 behält den eingefrorenen Synthesekern und repariert die Messinstanz: begrenzte Buffer-/Take-Ownership, vollständige Zeit-/Format-/Endprüfung, False-PASS-Abwehr, separater Recorderüberlauf ohne Lease-Konflikt, direktes primäres Routing mit parallelem Recorder, exklusive Proben und exportierbare Rohdaten samt unabhängiger Neuberechnung.

21 gezielte Recorder-/Auswertungsfälle und die vorhandenen Core-/Safetytests bestehen. Die vollständige aktuelle Suite läuft über `tests/run-326.sh`; die ursprüngliche Aussage, `run-all.sh` enthalte die 326-Tests, war unzutreffend. `run-all.sh` bleibt der historische 325-Buildrunner.

Die reale Browser-/Audio-Validierung ist weiterhin offen. Sols `ERR_BLOCKED_BY_ADMINISTRATOR` bleibt als frischer Befund des ursprünglichen Versuchs erhalten. In diesem Audit wurde kein weiterer Browserlauf behauptet.

Aktuelle Begründung: `ASTRA_326_PCM_TAP_AUDIT.md`. Konkreter nächster Auftrag: `ASTRA_326_NEXT_STEPS_AND_SOL_HANDOFF.md`.
