# XenSonar P4C2-N21 – Notenlänge und fester Schnellzugriff

Stand: 18.10.2026. Direkte Weiterentwicklung des N20-Audiostands dieser Arbeitslinie. Die parallel entwickelten N20-Forge-/Navigationsfassungen wurden nicht eingemischt.

Spielbare Datei: `XenSonar_F448_S1_P4C2_N21_Live_Length_Quick_Access_Test.html`.

## Bedienung

Die Apostroph-/Akut-Taste ist jetzt ein Eingriff in die Länge der aktuell klingenden manuellen Noten. Die bisherige Verlängerung beim Halten bleibt bestehen. Neu: Auch eine gewöhnliche, bereits angeschlagene kurze Note wird beim Loslassen der Taste vorzeitig beendet. Zum Verkürzen also einen Ton spielen, die Taste kurz drücken und wieder loslassen. Der Abbruch benutzt kurze Ausblendungen, statt die Wellenform hart zu zerreißen.

Der Eingriff betrifft manuelle Wellenstarter-/Keyboard-Stimmen sowie bereits durch die Verlängerung gehaltene Partikel. Gewöhnliche Partikel, Beat, Bass, Material Track und Root Follow Loop behalten ihre unabhängigen Besitzer. Es gibt keinen globalen Stopp des gemeinsamen Audiokontexts. Die vorhandene deutsche Equal-/Akut-Zuordnung bleibt erhalten; das englische Apostroph-Zeichen wird zusätzlich erkannt. Die deutsche Ä-Taste wird nicht als Apostroph umgedeutet.

Der Schnellzugriff besitzt weiterhin fünf vertikale Spalten. Die komplette freie Fläche unter Keyboard Pan bleibt die linke Ablagefläche. Wenn beispielsweise sieben Material-Einträge links nicht mehr passen, erscheint die Sammlung rechts oben; das Ziel zum Hineinziehen bleibt links. Rechts gibt es kein Blinksignal. Die zusätzliche innere Scrollbar entfällt. Sehr lange Sammlungen verwenden den vorhandenen Seitenscroll.

Genau zwei grüne Pulse entstehen durch einen tatsächlichen Klick auf einen Bibliotheks-/Playlist-Eintrag eines Menüs. Das Öffnen eines Menüs, ein abgeschlossener Ziehvorgang und die Rückkehr in den Hauptraum lösen keinen solchen Hinweis aus. Die Hervorhebung während des tatsächlichen Ziehens markiert weiterhin das aktuelle linke Ablageziel.

## Backend und Flüssigkeit

- C11/Entrophon und C11/Wave besitzen jetzt auch für endliche manuelle Stimmen einen expliziten Abbruchgriff. Die native Release-Operation akzeptiert dafür endliche Stimmen; Update-/Gliss-Operationen bleiben auf gehaltene Stimmen beschränkt. Die Synthese- und Renderfunktionen werden nicht verändert.
- Der separate C11-Core für manuelle Direktanschläge beendet seine eigenen Stimmen mit einer 3-ms-Entklickung und einem Epochenwechsel. Dieser Befehl wird vom gemeinsam verwendeten Entrophon-/Wave-Host ausdrücklich ignoriert. Die nächsten Anschläge verwenden die bestätigte neue Epoche; es entsteht keine Nachholwarteschlange.
- Ein bereits beendeter nativer Ton kann noch einen konservativen Reservierungsnachlauf besitzen. Ein Abbruch dieses Tokens gilt als abgeschlossen; er darf keinen Panic des gemeinsamen Hosts auslösen.
- Nodal beendet die ausgewählten manuellen Stimmen über den vorhandenen kurzen Retire-Fade. Noch nie gerenderte zukünftige Noten werden ohne Phantomanschlag entfernt. Physische Tickets und Kapazität werden genau einmal freigegeben.
- Sample-Starts erhalten eine Revisionsprüfung über den asynchronen Ladevorgang hinweg. Wird inzwischen losgelassen, darf das geladene Sample nicht verspätet anschlagen. Bereits gestartete Samples werden in derselben Live-Stimmenliste geführt und sauber entfernt.
- Geometrie des Schnellzugriffs wird in zusammengefassten Animation-Frame-Messungen aktualisiert, mit Größenbeobachtung und Resize-/Scroll-Ereignissen. Im React-Renderpfad sind dafür keine DOM-Geometriemessungen mehr nötig. Die fünf Spalten werden in einem Durchlauf gruppiert.
- N20s gemeinsame Nodal-Kapazität, Prioritäten und vorbereitete Tonhöhen bleiben erhalten. Es wird kein neuer Klangqualitäts-Fallback und keine automatische CPU-Budgetausweitung aktiviert.

## Prüfung

**65 von 65 Prüfpunkten bestanden**, Ergebnis und vollständiges Log: `results/p4c2-n21-validation.json` und `.log`. Zusätzlich separat:

| Prüfung | Ergebnis |
|---|---|
| Reale Browser-Ziehgesten und Umsortierung | 23 von 23 Fällen bestanden; alle fünf Menüarten, vier anfängliche Ziehrichtungen, drei echte Umsortierungen |
| Neue Browser-Szenarien | 7 Szenarien bestanden: sieben Material-Schnellzugriffe, voller linker Zielbereich, nur links zwei Pulse, keine Menüöffnungs-/Drag-/Raumwechsel-Wiederholung, mehrere Fenstergrößen und 30 Einträge mit einem Seitenscroll |
| Echter Worker + AudioWorklet im Browser | 48/96 kHz, drei Stimmen, Glissando, Release und vier getrennte Kanäle: maximaler PCM-Fehler 0 gegenüber unverändertem N6-Klangkern |
| Native C11-Parität N20 gegen N21 | Entrophon, Wave und Core bei 44,1/48/96 kHz; 190 Blöcke pro Kombination, alle 18 Ausgänge samplegenau identisch ohne neuen Eingriff |
| Neue native Release-Operation | Endliche/gehaltene Entrophon- und Wave-Noten, Abbruch vor dem ersten Anschlag, drei Sample-Raten, Schutz einer gleichzeitig weiterklingenden Stimme, kein gemeinsamer Panic |
| Nodal und Samples | Produktiver Nodal-DSP/Port-Lebenszyklus bei 48/96 kHz; selektive Abbrüche, geschützte gewöhnliche Partikel, keine zukünftigen Phantomanschläge, eindeutige Ticketfreigabe; Sample-Ladeabbruch und erneuter Start |
| Erhalt der übrigen Architektur | Hashprüfung gegen N20: exakt zehn produktive Dateien geändert; Nodal-DSP, Vorbereitung/Kostenvertrag, RFL, Drum/Bass/Material-Routing und Physik unverändert |
| Standalone-Build | Reproduzierbarer Build und JavaScript-Syntaxprüfung bestanden |

Die fehlerhafte alte Ablagehöhe ist reproduzierbar: `node tests/p4c2-n21-quickdock.cjs --baseline` scheitert absichtlich an 52 statt 220 Pixeln Zielhöhe. Ohne `--baseline` besteht dieselbe Prüfung.

Der native Patch ist reproduzierbar und auf die Release-Zulassung begrenzt: `npm run verify:p4c2-n21:c11`. Das Tool verwendet die mitgelieferte N20-Binärreferenz und exakt `wabt@1.0.39`; es prüft den Ausgangshash und die erzeugten Bytes. Es wird nicht in der Spiel-HTML ausgeführt. Originalhash und Patchschritte stehen im Tool, der Quellvergleich in `N20_to_N21_Live_Length_Quick_Access.patch`.

## Start und Weiterentwicklung

```sh
npm ci
node build.cjs --verify
npm run test:p4c2-n21
npm run test:p4c2-n21:browser
npm run verify:p4c2-n21:c11
```

Browserprüfungen benötigen Playwright/Chromium. Alternativ kann `XEN_CHROMIUM_PATH` auf einen vorhandenen Chromium zeigen. Geprüft wurde hier mit Headless Chromium 131. Der Standalone-Build selbst benötigt keinen Server; die ausgelieferte HTML lässt sich direkt öffnen.

Die N20-Testskripte und Übergabe bleiben als Historie enthalten. Ihr alter Preservation-Test verlangt unveränderte C11-/UI-Dateien und ist für N21 durch den expliziten N21-Vertrag ersetzt. Der historische `rw2-pcm-contract` erwartet weiterhin einen sehr alten Recorder-Bytehash (139285 Bytes); schon die unveränderte N20-Referenz besitzt 139891 Bytes. Dieser historische Test ist daher keine N21-Abnahme. Die fünf betroffenen Dateien sind zwischen N20 und N21 byteidentisch; der frisch erzeugte Quellindex besteht seine eigene Aktualitätsprüfung. Der P4B-Integrationstest bindet nun die tatsächlichen Funktionen zur Verwaltung endlicher Live-Stimmen mit ein; seine fachlichen Assertions bleiben erhalten.

## Prüfgrenzen

Kein physischer Hörtest auf dem Nutzer-Laptop, kein Opera-/Firefox-Durchlauf und keine Aussage, dass alle Hardware-Bursts beseitigt wären. Die kurzen Abbruchfades sind im PCM geprüft; ihre musikalische Wirkung im konkreten Mischbetrieb bleibt auf dem Zielgerät zu hören. Effektbusse können nach einem Notenabbruch ihre bereits angeregten Ausklänge behalten. Browser- und Hosttests beweisen korrekte Steuerung, Zustandsfreigabe und Referenz-PCM, aber keine Audio-Deadline unter jeder CPU-/Gerätelast.

HTML-SHA-256: `7c10a49a76420ac4e4fbc1b34e65123968c60e7582646331df4d2aed8423475e`.

## Auslieferungshinweis

Die fertigen N21-Dateien wurden erstellt und lokal geprüft. Die automatische dauerhafte Dateiablage wurde wegen des erreichten Dateispeicherlimits abgewiesen. Die Dateien werden deshalb direkt zum Herunterladen verlinkt; für eine dauerhafte Sicherung bitte herunterladen.
