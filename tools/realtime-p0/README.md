# Xensonar 326 — P0-W PCM-Labor, Astra audit1

Korrigierter Messstand auf dem unveränderten Synthesekern `p0-w/325-audit1`. **Source-/Modellsuite PASS; Browser-/Geräte-/Realtime-Abnahme offen.** Kein neuer Produktrelease. Goldstand 323 und Performance-Oracle 320 bleiben eingefroren.

Zuerst `ASTRA_326_PCM_TAP_AUDIT.md`, danach `ASTRA_326_NEXT_STEPS_AND_SOL_HANDOFF.md` lesen. Der vollständige Astra-325-Kernbefund bleibt in `ASTRA_325_P0W_AUDIT.md` erhalten. Historische Sol-326-Berichte und die für Gegenbeispiele nötigen Originalquellen liegen unter `artifacts/original-sol-326/`; sie sind keine aktuellen PASS-Belege.

## Browserlauf

Vom Paketverzeichnis aus:

```bash
node tools/realtime-p0/harness/server.mjs
```

Auf einem freigegebenen Audiohost `http://127.0.0.1:32191/web/index.html` öffnen. **Start P0-W**, dann manuell Chord3/Hold/Release/Programm/Panic prüfen. **Run automated probes** führt W-G1 aus. **Run PCM stall capture** führt fünf Aufnahmen durch und benötigt einen gültigen W-G1-Bericht. Kein manueller Spielbetrieb während der automatischen Probe; Panic bricht ihre Gültigkeit ab.

Drei Downloads: `P0_BROWSER_RESULT.json`, `P0_STALL_CAPTURE_RESULT.json`, `P0_STALL_CAPTURE_EVIDENCE.json`. Letzterer enthält Roh-PCM, Metadaten und Hashes.

```bash
node tools/realtime-p0/harness/unpack-pcm-evidence.mjs P0_STALL_CAPTURE_EVIDENCE.json decoded-capture
```

`decoded-capture` muss ein neuer Ordner sein. Die Auswertung erstellt `RECOMPUTED_CAPTURE_REPORT.json` und fünf Float32-Stereo-WAVs. `*_RECORDING_GAPS_OR_INVALID.wav` enthält als Aufnahmeverlust markierte Null-Platzhalter; das ist keine Messung von Stille im Audiographen. Die Software behauptet keinen physischen Output-PASS.

## Source-/Modelltests

Mit dem vorhandenen eingefrorenen WASM und dem Linux-Smoke:

```bash
bash tools/realtime-p0/tests/run-326.sh
```

Ausgeführt mit Node 24.19.0 auf Linux. Der Runner prüft den exakten WASM-Hash und baut keinen DSP neu. Der native Smoke ist Linux-spezifisch. Browserläufe auf anderen Betriebssystemen brauchen ihn nicht; die neuen drei Node-Tests können dort separat laufen:

```bash
node tools/realtime-p0/tests/test-pcm-tap.mjs
node tools/realtime-p0/tests/test-pcm-tap-client.mjs
node tools/realtime-p0/tests/test-capture-oracle.mjs
```

Die sieben ursprünglichen Gegenbeispiele lassen sich mit `node tools/realtime-p0/tests/probe-original-326.mjs` gegen die archivierten Originaldateien nachstellen. Das ist eine Fehlerdemonstration, kein aktueller Regressionstest.

`tests/run-all.sh` ist der historische 325-Buildpfad und kompiliert DSP-Artefakte neu. Er ist **nicht** der Runner für die eingefrorene 326-Validierung. `P0W_CHORD3_OFFLINE.wav` ist eine geerbte Offline-Tonprobe, keine neue Browseraufnahme. Frische 326-audit1-Ergebnisse stehen in `artifacts/ASTRA_326_RUN_ALL.txt`, `PCM_TAP_MODEL_TEST.json`, `PCM_TAP_CLIENT_TEST.json` und `CAPTURE_ORACLE_MODEL_TEST.json`.

## Grenzen

Der Hauptpfad läuft direkt vom neutralen Bus zur Destination; der Recorder misst in einem parallelen stummen Zweig. Diese Fehlertrennung bedeutet keine eigene CPU-Reserve. Transfer-/Message-Handler und GC müssen in realen Callbackmessungen berücksichtigt werden. Sols dokumentierte Administratorblockade wird nicht umgangen. Vollständige Hostdaten, Trace, Hörnotiz und gegebenenfalls lokalisierte Loopback-Aufnahme sind Teil des Folgeauftrags.
