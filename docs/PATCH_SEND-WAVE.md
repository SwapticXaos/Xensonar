# SEND-WAVE: „Send to Wave Editor“ und „Send to Multitrack“ im Aufnahmebereich des Live-Raums

Status: CODE_PRESENT, BROWSER_CHECKED (`tests/e2e/live_send_wave_multitrack.cjs`, Chromium headless, echter Take). Nicht USER_ACCEPTED.
Zone: KALT (läuft nur auf Knopfdruck; Wave Editor und Multitrack sind ohnehin lazy). Daten-Owner: Take = vorhandener Recorder-Puffer; Multitrack-Material = `__XenMultitrackInbox` / `__registerDurableMaterial` (unverändert).

- „➔ Spectral Import“ heißt jetzt **„➔ Send to Wave Editor“**, daneben **„➔ Send to Multitrack“** (beide nebeneinander, bei schmalem Fenster als Paar umbrechend). Gilt für Take (Full/Crop) und für Auszüge aus dem Long-Session-Archiv.
- **Wave Editor:** Der Take (lossless Float32-WAV, ohne das alte „-materialschmiede“-Namensanhängsel) geht über den vorhandenen Datei-Empfang des Editors (derselbe Weg wie „Send to Editor“ im Forge und das Multitrack-Clip-Edit). Neu `__XenSendToWaveEditor`: öffnet Material Forge (der Editor ist lazy, wird mit Wiederholung abgewartet), lädt den Take, öffnet den Editor und **scrollt ihn an den oberen Rand**. Enthält der Editor ungespeicherte Änderungen, fragt es vor dem Ersetzen. Scheitert es, kehrt man in den Live-Raum zurück und die Meldung steht im Aufnahmebereich.
- **Multitrack:** derselbe lossless WAV über `__XenMultitrackInbox.sendBlob` (Tempo = Live-BPM beim Senden, kein Retiming des Materials); Room IV öffnet sich und legt den Take als neue Spur unter die vorhandenen.
- Test: Take aufnehmen (Taste halten), „Send to Wave Editor“ → Editor mit 150 400 Frames geladen, offen, Oberkante im Fenster; zurück, „Send to Multitrack“ → Material im Projekt bzw. Inbox.
- Offen: nicht gehört; die frühere Spectral-Import-Ablage (Material-Intake-Rack „MASTER_RECORDING_RACK“) wird aus dem Aufnahmebereich nicht mehr bedient (Wave Editor lädt über den Material Intake).
- Rollback: `1db43b2`.
