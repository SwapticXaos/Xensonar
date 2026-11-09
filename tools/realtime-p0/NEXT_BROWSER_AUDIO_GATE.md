# Nächster Browser-/Audio-Gate — aktualisiert für 326-audit1

Die ursprünglich hier beschriebene Messergänzung ist implementiert und nach dem Sol-Return korrigiert. Der aktuelle Vertrag, die exakten Akzeptanzkriterien, Laufbefehle und die Rückgabeanforderungen stehen in **ASTRA_326_NEXT_STEPS_AND_SOL_HANDOFF.md**. Die Auditgründe und tatsächlich ausgeführten Ergebnisse stehen in **ASTRA_326_PCM_TAP_AUDIT.md**.

Jetzt W-G1 und W-G2 auf einem bereits freigegebenen lokalen Audiohost ausführen. Den unveränderten WASM-Hash prüfen. Für 100/250/500 ms gilt ein echter UI-Stall. Der getrennte Recorderüberlauf hält nur Buffer-Rückgaben 1800 ms zurück; Heartbeats laufen weiter. Die alte Aufforderung zu einem 1800-ms-UI-Stall als Recorder-/Continuity-Test ist wegen der 1500-ms-Lease ersetzt.

Die fünf Roh-Takes müssen exportiert und unabhängig neu ausgewertet werden. Ein interner PCM-PASS ist kein Geräte- oder Callback-PASS. Bei normaler Aufnahme sind Lücken ein Fehler; beim gezielten Recorderüberlauf bleiben sie ausdrücklich markierter Aufnahmeverlust.

Kein weiterer Versuch, die dokumentierte Administratorblockade zu umgehen. Fehlende Ausführung bleibt offen. Produktintegration, kontinuierlicher Root, Patternwechsel und native Realtime-Engine erhalten eigene Verträge und Gates. Die historische Fassung dieses Dokuments liegt unter `artifacts/original-sol-326/`.
