# Mikrofonaufnahme am Audio-/Donor-Import

Basis: Commit `9ab3d04b2d753a6928c6bd30856108b6351bbc4a`.
Build: `Xensonar_N21_F2_Microphone_Test.html`, 5.552.168 Bytes.
SHA256: `9e1152600849f0850556114525c36ed2ba0283fee4238daffc6a103158f213a2`.

## Bedienung

Unter **II. Material Forge → SpectralForge → Sound Material · Donor** steht **● Mikrofon** unmittelbar neben **Import Audio**. Der erste Klick fordert die native Browserberechtigung an. Nach Freigabe zeigt derselbe Button während der Aufnahme **■ Stop** und die verstrichenen Sekunden. Stop beendet die Aufnahme und importiert sie direkt als neue Audioquelle. **Verwerfen** löscht den laufenden Mitschnitt und erhält die bisherige Donor-Quelle. Ein Mitschnitt endet spätestens nach 60 Sekunden.

Die Aufnahme verwendet den vorhandenen `File → Local File → Cg`-Importweg. Der bisherige Vollbild-/Masken- und Donor-Workflow bleibt erhalten. Die neue Stimme erscheint als Wellenform mit eigener Auswahlmaske; bestehende gezeichnete Spektralfiguren werden durch den Aufnahme-Import nicht ersetzt. Der Import aktualisiert wie bisher seine Quellen-/Namensmetadaten. Die vorhandenen Donor-Aktionen entscheiden anschließend über die Nutzung der gewählten Maske.

Der Browser benötigt einen sicheren Kontext und Mikrofon-/MediaRecorder-Unterstützung. Üblicherweise sind dies HTTPS oder localhost; lokale Dateien richten sich nach Browserberechtigungen. Abgelehnte Berechtigung, fehlendes/belegtes Gerät, Encoderfehler, leere Aufnahme und Importfehler ergeben eine Meldung am Button. Danach ist ein erneuter Versuch möglich. Eine abgebrochene Berechtigungsanfrage kann vom Browser noch angezeigt werden; wird sie später freigegeben, gibt der verworfene Versuch seine Spuren sofort frei und importiert nichts.

## Eigentümerschaft und Klangweg

Die neue Capture-Komponente besitzt ausschließlich ihren Mikrofon-Stream, MediaRecorder, Datenstücke und zwei begrenzte UI-/Zeitlimit-Timer. Es wird kein Mikrofon-Monitor an den Ausgang angeschlossen. Eine Aufnahme wird nur durch einen ausdrücklichen Klick gestartet. Der neue Weg benötigt keine Server-/Upload-Funktion.

Das unterstützte Browserformat wird über `MediaRecorder.isTypeSupported` gewählt: bevorzugt WebM/Opus, alternativ Ogg/Opus oder MP4; ansonsten verwendet der Recorder seinen Browserstandard. Dies ist keine Zusage verlustloser Aufnahme. Echo Cancellation, Noise Suppression und Auto Gain werden für die Materialaufnahme deaktiviert angefragt; die tatsächliche Unterstützung hängt vom Gerät/Browser ab. Dekodierung, Downmix, Quellenauswahl und Donor-Verarbeitung übernimmt unverändert der bestehende Audioimport.

Dateiimport und Quellenadapter-Auswahl werden während der Mikrofonaufnahme bzw. Übernahme gesperrt, damit die häufigsten konkurrierenden Imports nicht über dieselbe Eingabe laufen. Die Stop-/Abbrechen-/Verwerfen-Aktionen bleiben unabhängig von diesem Import-Busy-Zustand bedienbar.

Stop, Verwerfen, Recorderfehler und Unmount räumen Timer und sämtliche Stream-Tracks auf. Ein Generationstoken verhindert, dass eine verspätete Mikrofonfreigabe eine verworfene Aufnahme wieder startet. Die App hält Räume teilweise unsichtbar montiert: Ein zusätzlicher lokaler Observer an den vorhandenen Vorfahren beendet den Mitschnitt beim tatsächlichen Ausblenden des Raums. Er reagiert auf Room-/Keepalive-Sichtbarkeit, nicht auf Scrollposition; Scrollen darf eine Aufnahme nicht beenden. Auch `pagehide` beendet laufende Aufnahmen.

## UI-Entscheidung

Workflow: lokale Audioaufnahme mit unmittelbarer Zustandsrückmeldung, anschließend iterative Donor-Auswahl. Die Aufnahme gehört zum vorhandenen Donor-Importbereich. Im Hauptraum oder Nodal-Raum sind diese Controls nicht relevant. Der bereits globale Ausgangs-Recorder zeichnet ein anderes Signal auf und bleibt unverändert.

Gewählt wurde ein kompakter Recorder direkt beim vorhandenen Import, statt einer separaten globalen Aufnahmeleiste oder eines weiteren Modals. Damit bleiben Quelle, Status, Stop und anschließend die Wellenform räumlich zusammen. Die Aufnahme hat einen Controller; es gibt keine zweite Importverarbeitung. Die Controls wickeln bei 720 px Breite um, statt eine weitere Scrollleiste zu erzeugen.

## Nachweise

- Host-Lebensdauertests: vollständige Dateiübergabe, verspätete Berechtigung nach Abbrechen, Unmount, verweigerte Berechtigung, Encoderfehler, leere Aufnahme, Recorderfehler, Zeitlimit und vollständige Timer-/Track-Freigabe.
- Chromium mit synthetischem Browser-Testmikrofon, nativem `getUserMedia`, nativem MediaRecorder und tatsächlichem bestehenden Audio-Decoder. Die erzeugte Datei wird über den realen UI-Callback importiert; Dauer, endliche Sampledaten und nichtstille Wellenform werden geprüft.
- Eine zuvor angelegte nichtleere Spektralfigur bleibt im echten Store exakt identisch. Verwerfen behält die zuvor importierte Donor-Quelle.
- Alle gestarteten Audio-Tracks enden nach Stop, Verwerfen und realem Raumwechsel. Nach simuliert verweigerter Berechtigung startet ein neuer nativer Aufnahmeversuch wieder erfolgreich.
- Bedienelemente sind bei 1490 und 720 px sichtbar und erreichbar. Keine ungefangenen Browserfehler.
- Sämtliche 65 bestehenden Host-/DSP-/Worker-Prüfungen bestanden. Ergänzend Workflow-Integrity, Merge, Forge-Fortschritt/PCM und der reale Forge-Play-Fortschritts-Browsertest bestanden.
- Der Hash-Vertrag erhält 226 von 227 bestehenden Quell-/Stil-/Template-Dateien exakt. Eine vorhandene UI-Datei bindet das neue Aufnahmemodul ein. Alle Synthese-, Rendering- und Transportquellen bleiben unverändert.

Die früheren Erhaltungs-Baselines bleiben eingefroren; Tests erlauben ausschließlich die dokumentierten neuen Mikrofon-Datei-Hashes. Aktuelle Messdaten und Screenshot stehen in `results/microphone/`; frisch ausgeführte historische Prüfungen liegen unter `regression-output/`. Die anfängliche Raumwechsel-Reproduktion dokumentiert den Keepalive-Sonderfall vor dem Visibility-Cleanup.

Kein physisches Mikrofon und keine eigene Opera-/Firefox-/Safari-Installation sind hier verfügbar. Die tatsächliche Geräteauswahl, Berechtigungsdialoge und Eingangsqualität am Rechner sind daher separat von den nativen Chromium-Nachweisen zu beurteilen.

Das schlanke Quellenpaket enthält sämtliche Quellen, den aktuellen Build und Testreferenzen. Drei ältere, von den Tests nicht benötigte eigenständige Build-Kopien (Granular Hold, Live Stability, Forge Progress) bleiben im Repository und in den bisherigen Artefakten erhalten, werden im neuen Quellen-ZIP aber nicht erneut dupliziert.
