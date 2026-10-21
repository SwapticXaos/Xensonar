# XenSonar P7.24 · Song Projects, Parts und gespeicherte Entrophon-Instrumente

Stand: 21. Oktober 2026. Ausgangsstand: `5e82993f5bf44c0c65c0dfbabacaf0688565a930`. Die neue Einzeldatei heißt `Xensonar_P7_24_Song_Projects_Test.html`; historische HTML-Dateien werden nicht überschrieben.

## Bedienung und Umfang

**Song Projects** öffnet den Browser/Editor für Songs und Parts. Die fünf Bibliotheksregister verwenden die bestehenden Material-/Rhythmusquellen. Ein Song speichert geordnete Referenzen auf diese Einträge. Songs und Parts lassen sich anlegen, umbenennen, duplizieren, löschen und ausdrücklich speichern. Bibliothekseinträge lassen sich per Zeigerbewegung hinzufügen, im Part neu ordnen und per Rechtsklick entfernen. Escape bricht eine laufende Ziehbewegung ab. Auf schmalen Fenstern bleiben die Spalten horizontal scrollbar.

Öffnen, Auswählen und Bearbeiten im Editor verändert den laufenden Klang nicht. Erst **Activate Part** ersetzt den Quick Access. **Use Current Quick Access** übernimmt dessen aktuellen Zustand in den gewählten Part. Fehlende Bibliothekseinträge bleiben als Referenz erhalten und werden markiert. Speichern und Import melden Fehler sichtbar; fehlerhafte Manifeste werden vor der Übernahme abgewiesen.

Der Song-Manifest-Export enthält **nur Referenzen**, keine vollständigen Audiodateien oder Bibliotheken. Für die vollständigen Bibliotheken und Klangressourcen bleibt das vorhandene Tüftel-/Workspace-Paket zuständig. Nach dessen vollständigem Import werden globale Einstellungen weiterhin durch einmaliges Neuladen aktiviert. Ein eigenständiges vollständiges Song-Audioarchiv und automatisches Part-Umschalten während einer Performance gehören nicht zu dieser Freigabe.

Die gelieferte P7.24-Oberfläche ordnet Forge-Eingänge, Profile und Werkzeuge neu. Keyboard- und Wave-Starter-Lautstärke bleiben unabhängig. Die Korrektur gespeicherter Entrophon-Instrumente lässt die Zulassungskosten aus der ausgewählten gespeicherten Definition bestimmen. Eine günstigere Current-Einstellung unterschätzt damit nicht mehr den Bedarf eines aufwendigeren gespeicherten Klangs. Synthese, PCM-Auflösung und Endstufe werden dadurch nicht reduziert.

## Prüfungen und Nachweise

Der gezielte Song-Browsertest prüft native Zeigerbewegungen in allen fünf Registern, unveränderte Bibliotheksreihenfolge und null Adapter-Auswahl-/Audio-Startaufrufe beim Bearbeiten. Ein frischer Browser importiert das vorhandene vollständige Tüftel-Paket mit zwei Songs einschließlich ungespeichertem Entwurf, zwei WAV-Materialien und zwei Root-Follow-Mitgliedschaften; die Referenzen werden wieder aufgelöst. `browser-report.json` und `song-projects-desktop.png` dokumentieren diesen Lauf.

Der frische Host-Freigabelauf besteht **53 von 53** Prüfzeilen einschließlich reproduzierbarem Build, ohne Fehler (11:32:22 bis 11:34:35 UTC, rund 133 Sekunden). Der gesonderte Befehl `npm run test:merge` besteht ebenfalls. Die Host-Matrix prüft P7.24, Song Projects, Lautstärke-Isolation, gespeicherte Entrophon-Zulassung und die bisherigen Funktions-/Erhaltungsketten. Die Logs der anfänglichen Integrationsfehler bleiben erhalten: Die neue Quelldatei musste in den exportierten historischen Ergänzungslisten an ihrer tatsächlichen Manifest-Position erscheinen; die vollständige Quellreihenfolge bleibt separat exakt geprüft.

Der vollständige erste Chromium-Lauf umfasst **15** Prüfzeilen: **14 bestanden**, eine native Nodal-Probe schlug zunächst fehl (11:32:29 bis 11:37:26 UTC, rund 297 Sekunden). Die beiden neuen Browserprüfungen, Telemetrie, bisherige Forge-/Workflow-Prüfungen und reproduzierbarer Build bestanden. Der Chromium-Lauf und die gezielten Nachprüfungen stehen in `results/p7-24-song-projects/browser-validation.json` und den Nachprüfungslogs. Eine erste Nodal-Ball-Prüfung erreichte im nativen Probe-Worklet noch keine Linienfrequenz (0 statt 542.5036 Hz); derselbe unveränderte Einzeltest bestand im direkten Wiederholungslauf. Der erste Fehler wird mit `nodal-browser-initial-failure.json` und dem vollständigen Log aufbewahrt. Die Untersuchung findet einen bestehenden Testvertrag: Der Audio-Controller akzeptiert erst nach mindestens 30 ms AudioContext-Zeit den nächsten Steuerrahmen und setzt nach mehr als 250 ms die Kreuzungshistorie zurück. Eine Bereitschaftsmeldung des Worklets und 45 ms Wanduhrzeit garantieren diese Bedingungen nicht. Ein gezielter Kontrollversuch ohne Audio-Zeitfortschritt reproduziert die Nullfrequenz auf dem Ausgangsstand und der neuen Fassung; die unveränderten Produktionsquellen sind per SHA-256 belegt. Der Test wartet jetzt begrenzt auf diesen tatsächlichen Audio-Zustand. Der korrigierte Einzeltest besteht auf beiden Fassungen und ein unabhängiger abschließender Lauf auf dem Freigabestand besteht ebenfalls. Damit sind alle **15** Browser-Prüfzeilen nachgewiesen: 14 im ersten vollständigen Lauf und eine gezielt nach der Testkorrektur; `browser-revalidation.json` stellt diese Kombination ausdrücklich dar und ersetzt den ursprünglichen Fehlerbericht nicht. Frequenz, Impuls, Abklingen, Nullpegel, Mute und konstante AudioNode-Anzahl bleiben vollständig geprüft. Die genaue Clock-Situation des ersten nicht instrumentierten Fehlers lässt sich daraus nicht nachträglich beweisen. Ein bestandener Wiederholungslauf belegt keine garantierte Echtzeitfrist unter beliebiger Rechnerlast.

Zusätzlich bestehen die exakten PCM-Vergleiche: 18 Polytrace-Fälle samt Metadaten und Abbruch, stereoidentische Emilia-Ausgabe, 95232 Nodal-Samples bei sofortiger/gestaffelter Vorbereitung sowie 108 Kernel-Fälle mit 9702873 bitidentischen Float32-Kanalwerten und exakten Zustands-Snapshots. Die Matrixdauer ist eine Laufzeitangabe des Freigabetests, keine allgemeine Performance-Zusage.

Das separat entpackte Quellarchiv baut mit den bereits installierten Abhängigkeiten über `NODE_PATH` dieselbe Einzeldatei bytegenau neu. Build-Verifikation, Source-Index-Frische, P7.24-Erhaltung, Song-Speichertest und Entrophon-Kostenmatrix bestehen auch aus dem entpackten Archiv. Der Patch lässt sich mit `git apply --cached --check` gegen den exakt genannten Ausgangsindex anwenden. Diese Nachweise stehen in `source-archive-review.json` und `.log`.

Aktive HTML: **5751989 Bytes**, SHA-256 `e2b2384a0addae4c8a8720eff0c60bec4f6d44af89c382602f80d2f531cae86d`.

Die P7.24-Erhaltungskette prüft alle 237 bisherigen Quellen, Styles und Templates gegen den Ausgangsstand. Zulässige Änderungen stehen als exakt rücknehmbare Textkorrekturen in `corrections.json`; neue Quelldatei und neuer Style sind mit SHA-256 und Position in `additions.json` festgelegt. Die bisherigen Erhaltungstests bleiben aktiv und erhalten eine auf den bewiesenen Ausgangsstand projizierte Dateiliste. `historical-files.json` schützt 868 bisherige Artefakt-, Messdaten- und HTML-Pfade. Neue Testausgaben aus alten Ergebnisverzeichnissen werden unter `regression-output/` gesichert und die ursprünglichen Bytes anschließend wiederhergestellt. Die abschließende Prüfung besteht für alle **868** historischen Pfade einschließlich der exakt erhaltenen ersten **111** Einträge von `artifacts/SHA256SUMS`; neue Produkte werden angehängt. **25** von den Testläufen erzeugte oder veränderte Ausgaben wurden unter `regression-output/` gesichert, ihre historischen Pfade anschließend wiederhergestellt. `historical-preservation.log` enthält den vollständigen Abschluss.

## Grenzen

Der zusätzliche historische Einzeltest `tests/rw2-pcm-contract.cjs` scheitert sowohl auf der neuen Fassung als auch auf einer separat aus Git extrahierten unveränderten Ausgangsfassung `5e82993` identisch: Er erwartet eine alte zusammengefügte Recorder-Länge von 139285 Bytes, der Ausgangsstand enthält 141230 Bytes. Die fünf betroffenen Recorder-Quellen bleiben in P7.24 bytegleich zum Ausgangsstand. Dieser historische Snapshot-Test wurde nicht umgeschrieben und wird nicht als bestanden ausgewiesen; beide Fehlerlogs liegen den Messdaten bei. Die aktuelle Erhaltungskette und die gesonderten PCM-Vergleiche sind davon unabhängig.

Browserprüfungen verwenden Chromium und tatsächliche React-/AudioWorklet-Laufzeitpfade mit messbarer Offline-/Tap-PCM-Ausgabe. Daraus folgt keine Prüfung einer physischen Audio-Schnittstelle und keine Aussage über andere Browser. Messwerte für Hauptthread-JavaScript sind keine DSP-Durchsatzmessung. Fehlende Referenzen werden absichtlich nicht gelöscht; ihre Klangressourcen müssen über das vorhandene Workspace-Paket verfügbar gemacht werden. P7.12 bleibt archiviert und unintegriert.

## Modellrollen

Implementierung, Regressionen und Freigabeintegration: GPT-6.1 Sol mit Reasoning High. Die vorherige schreibgeschützte Bestandsaufnahme verwendete Luna mit Reasoning High. Die genaue Modellzuordnung der Leitprüfung ist hier nicht unabhängig verifizierbar; eine Astra-Nutzung wird deshalb nicht behauptet.

## Pakete

- `Xensonar_P7_24_Song_Projects_Test.html`: direkt öffnungsfähige Einzeldatei.
- `XenSonar_P7_24_Song_Projects_Quellen.zip`: Quellen, Build, Tests, aktuelle Messdaten und ausgewählte historische Vergleichsdateien; unter 32 MiB.
- `XenSonar_P7_24_Song_Projects.patch`: Änderungen gegen den genannten Ausgangsstand einschließlich aktualisiertem Root-Testspiegel; die neue benannte HTML und Messdaten sind getrennt beigelegt.
- `P7_24_Song_Projects_Messdaten.zip`: aktuelle Freigabenachweise.
- `P7_24_Song_Projects_Pruefbericht.md`: dieser Bericht.

Ältere generierte Screenshots sind zur Größenbegrenzung nicht vollständig im Quellarchiv enthalten; sie bleiben unverändert im Repository und bisherigen Archiven.
