# XenSonar – technischer Gesamt-Audit

Stand: 19.10.2026, Commit `1179508dd99029be58554fc343a1ac4b9f781ae3`.
Geprüft wurde die aktive Anwendung unter `n21-f2`, nicht das historische Vite-Projekt im Repository-Wurzelverzeichnis. Anwendungscode und Klangmaschinen wurden nicht geändert.

## Einordnung

XenSonar ist ein weit entwickeltes experimentelles Musikinstrument mit substanzieller eigener DSP-Technik und mehreren bereits professionell angelegten Teilsystemen. Es ist deutlich mehr als eine HTML-Demo. Gleichzeitig ist es noch kein durchgängig konsolidiertes, auf verschiedenen Geräten nachgewiesen livefestes Produkt.

Die Reife ist ungleich verteilt: Klangerzeugung, Worker-Verarbeitung und einzelne Lebenszyklusverträge sind fortgeschritten; Datenportabilität, übergreifende Ressourcenplanung, Quellcode-Lesbarkeit und automatisierte Freigaben benötigen weitere Arbeit. Funktionale Breite ist kein Beweis für betriebliche Zuverlässigkeit. Ebenso bedeutet diese Einschätzung nicht, dass die bestehenden Instrumente generell instabil sind.

## Prüfgrundlage und Grenzen

- Reproduzierbarer Build: 5.573.851 Bytes, SHA256 `f6b462c8d7e9ac26cc62f51c363beee55afbbf4f0810f1f96f55236e87227bd3`.
- 202 JS-Quelleinheiten; statischer Index mit 6.450 Deklarationen und 1.079 Dateibeziehungspaaren. Das ist kein vollständiger Laufzeit-Abhängigkeitsgraph.
- 372 `.cjs`-Dateien unter `tests`; darin auch Hilfsprogramme. Diese Zahl bezeichnet weder die Zahl unabhängiger Tests noch eine gemessene Testabdeckung.
- Frisch bestanden: Build-Verifikation, Source-Index-Verifikation, Pitch-Space-Verhalten, Beibehaltung der Carrier-Maschine, RFL-Lebenszyklus und Mikrofon-Lebenszyklus.
- Frisch bestandener Chromium-Arbeitsweg: echtes Malen/Morph, alle acht Carrier-Maschinen mit endlichem und nicht stummem PCM, beide Play-Anzeigen, reversibles Detune, Undo/Redo und zwei Fensterbreiten.
- Zusätzlich Archiv-Codec und Snapshot-Größen mit Produktionsfunktionen im nativen Chromium geprüft (Messdaten: `Code_Audit_2026-10-19_Messdaten.json`). Kein vollständiger Klicktest aller Paketvarianten und kein vollständiger Testlauf sämtlicher historischer Suiten.
- Kein Hörtest über ein reales Audiointerface, kein Konzert-Dauertest und keine aktuelle Vergleichsprüfung in Firefox, Opera oder Safari. Keine Aussage über eine garantiert knackserfreie Polyphonie auf unbekannter Hardware.

## Priorisierte Befunde

### 1. Hohe Priorität: Forge-Snapshots sind im Workspace-Paket nicht vollständig rückladbar

Der produktive Paketexport bildet gespeicherte SyntheticForge-Arbeitsstände über `DLe().map(oLe)` ab. `gLe` serialisiert sie mit `AQ` und dessen Replacer `pLe`. Der Import verwendet `iLe`; `loadProjectSnapshot` gelangt anschließend über `yDe` zu `xDe.restoreSnapshot`.

`oLe` konvertiert einige Spezialfelder ausdrücklich, reicht `bodySnapshot` aber unverändert weiter. `pLe` ersetzt dessen Float32Arrays durch Metadaten mit begrenzter Vorschau. `iLe` rekonstruiert diese Body-Arrays nicht. Der anschließend ausgeführte Loader erwartet dagegen `.slice()`.

Reproduktion mit aktuellen Produktionsfunktionen: Snapshot erstellen → `oLe` → `AQ` → `JSON.parse` → `iLe` → `loadProjectSnapshot`. Ergebnis: `TypeError: t.bodyMass.slice is not a function`. Bereits ein leerer Body-Snapshot genügt. Ein einfacher JSON-Roundtrip scheitert ebenfalls, aber entscheidend ist der nachgewiesene produktive Codec-Pfad.

Der Loader verändert vor dem Fehler bereits Instrument- und Rasterzustände. Ein fehlgeschlagener Ladevorgang ist dadurch nicht atomar. Das ist ein konkreter Defekt dieses Archiv-/Snapshot-Pfades; daraus folgt nicht, dass sämtliche anderen Speicherwege oder IndexedDB-Arbeitsstände defekt sind.

Empfehlung: expliziter, versionierter Codec für alle Snapshot-Felder mit vollständiger Rekonstruktion, Größenprüfung und Migration. Erst vollständig dekodieren und validieren, danach den aktiven Zustand ersetzen. Test über Export, frischen Browserkontext, Import und Wiederöffnung; numerische Daten und Routing vergleichen.

Quellen: `src/app/forge/03_spectral_grid_and_archives.js`, `04_profiles_and_body_models.js`, `src/forge_and_melodic/02_forge_keyboard_and_history.js`.

### 2. Hohe Priorität: Undo ist nach Schritten, nicht nach tatsächlichen Bytes begrenzt

Ein Standardraster hat 2048 × 512 Zellen und zwei Float32-Ebenen: **8 MiB pro vollständiger Rasterkopie**. `Dk` kopiert zusätzlich den Body-Snapshot. Dessen acht Float32-Ebenen benötigen bei voller Rastergröße **32 MiB**. Ohne aktiven Body sind diese Ebenen zunächst leer.

Bei vollem Body ergeben sich mindestens **40 MiB je Undo-Eintrag** und rechnerisch **1.200 MiB für 30 Schritte**, bevor aktuelle Zustände, Stempel-Metadaten, Audiodaten und sonstige Objekte hinzukommen. Das ist eine aus den tatsächlich erzeugten Arrays abgeleitete Kapazitätsrechnung, keine Behauptung, jede Sitzung belege diesen Speicher oder ein gemessener Dauerbetrieb brauche genau diesen Wert.

Der Hör-Cache hat zusätzlich ein Zielbudget von 192 MiB und maximal 16 Einträge. Er behält mindestens einen Eintrag; ein einzelnes größeres Ergebnis kann deshalb das Zielbudget überschreiten. Die Hybrid-Pipeline hat eigene Budgets von 96 MiB und bis zu 48 MiB für Artefakte. Diese Werte sind wegen möglicher gemeinsamer Buffer keine einfache Messung des Gesamtspeichers. Ein gemeinsamer anwendungsweiter Grenzwert ist daraus nicht gegeben.

Empfehlung: zuerst bytebegrenztes Undo und Diagnoseanzeige; danach Kachel-/Delta-Snapshots oder strukturelle Wiederverwendung unveränderter Ebenen. Arbeitsspeicher für aktive Stimmen und aktuelle Wiedergabe vor abgeleiteten Vorschauen schützen. Die Klangverfahren müssen dafür nicht vereinheitlicht werden.

Quellen: `src/app/forge/05_forge_state_and_analysis.js`, `04_profiles_and_body_models.js`, `src/forge_and_melodic/10_audition_and_persistence.js`, `src/forge/hybrid/03_render_pipeline.js`.

### 3. Mittlere bis hohe Priorität: Dateiaufteilung bietet noch keine ausreichende Modul-Isolation

`build.cjs` fügt die Quelleinheiten in Manifest-Reihenfolge zusammen. Viele Schnittstellen bleiben globale Namen und gemeinsame mutable Zustände; die Reihenfolge ist Teil des impliziten Vertrags. In 51 Quelleinheiten gibt es Zeilen über 4.000 Zeichen, darunter eigene Anwendungslogik. Die größten eigenen Einheiten umfassen etwa 100–197 kB.

Das erschwert Reviews, Navigation und sichere Änderungen. Der Source-Index hilft, ersetzt aber keine gekapselten Interfaces. Nicht jede Querverbindung ist ein Fehler und nicht jede Doppelstruktur ist überflüssig: unterschiedliche Syntheseverfahren dürfen unterschiedliche Implementierungen behalten.

Empfehlung: schrittweise lesbare Quellen herstellen und stabile Module für Projekt-Codec, Render-Aufträge, Transport und Ressourcenbesitz herauslösen. Interfaces mit Einheiten, Zuständen, Abbruchregeln und Fehlerverhalten definieren; UI über Adapter anbinden. Single-HTML als Ausgabeformat kann bleiben. Kein Komplettumbau aller Klangmaschinen.

### 4. Mittlere bis hohe Priorität: Testbestand ist umfangreich, Freigabeprozess noch fragmentiert

Es existieren wertvolle DSP-, Worker-, Zustands- und echte Browserprüfungen. Daneben prüfen zahlreiche Tests Quelltextanker oder erlaubte Hashänderungen. Diese schützen eingefrorene Bereiche, belegen aber alleine nicht das Benutzerverhalten. Der gefundene Archivfehler zeigt eine Lücke über mehrere Teilsysteme hinweg.

`npm test` startet nur `tests/f3-instruments.cjs`; die weiteren Prüfungen sind auf viele gesonderte Skripte verteilt. Im untersuchten Repository wurde keine GitHub-Actions-Workflowdatei gefunden. Das schließt externe CI nicht aus, bietet im Checkout aber keinen nachgewiesenen automatischen Gesamt-Freigabeweg.

Empfehlung: kleine verbindliche Freigabesuite aus Build, Projekt-Roundtrip, Audio-Lebenszyklus, Play-Readiness, Raster-Mute, Hotkey und Raumwechsel; dahinter umfangreichere DSP- und Dauertests. Tests sollen beobachtbare Verträge brechen können. Hashschutz ergänzend erhalten.

### 5. Mittlere Priorität: Live-Kapazität benötigt ein gerätebezogenes Leistungsprofil

Worker, AudioWorklets, PCM-Caches, Epochen zur Verwerfung veralteter Ergebnisse und Aufräumlogik sind echte Stärken. Dennoch können Hauptthread-Berechnungen, Snapshot-Kopien, Speicherbereinigung und mehrere gleichzeitig aktive Systeme zusammen Lastspitzen erzeugen. Ein bestandenes isoliertes DSP-Szenario beweist keine störungsfreie komplette Aufführung.

Empfehlung: reproduzierbare kombinierte Szenarien mit Root-Wechseln, granularen Stimmen, Aufnahme, Raumwechsel und Forge-Hintergrundrendern. UI-Latenz, lange Tasks, Audio-Pegel, aktive Ressourcen und Speicherplateau protokollieren. Bei 48 kHz entsprechen 128 Audioframes rund 2,67 ms; reale Quanten und Pufferung sind laufzeitabhängig. Leistungsgrenzen daher in Stimmen/Szenarien auf Referenzgeräten angeben, nicht in HTML-Megabytes.

## Wie weit kann die HTML-Version wachsen?

Eine HTML-Datei ist ein Verpackungsformat. Für diese Anwendung ist keine feste universelle Browsergrenze erkennbar, die bei der aktuellen Dateigröße eine Desktop-Portierung erzwingt. Mehr Quellcode kann durchaus ergänzt werden. Wichtiger sind Laufzeitspeicher, DSP-Aufwand, Startup-Kosten, aktive Stimmen und die Zahl gleichzeitig arbeitender Systeme.

Die aktuelle HTML enthält keine `data:image`-Einbettungen. Daraus folgt keine allgemeine Stabilitätsgarantie: dekodierte Audiodaten, Spektralraster und Undo-Kopien sind hier wesentlich relevant. Beispiel: Eine Minute Stereo-Audio bei 48 kHz in Float32 benötigt allein rund 22 MiB PCM, unabhängig davon, wie klein oder komprimiert die importierte Datei ist. Das Quellen-ZIP enthält zudem Entwicklungsmaterial und ist kein Maß für den Speicherbedarf der Anwendung.

Neuere Browser können helfen; zusätzliche Fähigkeiten ersetzen keine Ressourcenbudgets. Eine konkrete Zahl noch möglicher Features wäre unseriös. Kleine UI- oder Verwaltungsfunktionen kosten wenig; zusätzliche lange Stereo-Render oder hochpolyphone Echtzeitverfahren können erheblich kosten.

## Desktop-Perspektive

Desktop lohnt sich für verlässliche Installation, klarere Dateiverwaltung, Backups, Updates und stärkere Integration in das Betriebssystem. Ein Electron- oder Tauri-Fenster allein beseitigt weder Speicherprobleme noch Audio-Überlastung. Electron kann eine feste Chromium-Version mitliefern; Tauri hängt stärker von der WebView des Betriebssystems ab. Beides verlangt eigene Tests für Mikrofonrechte, Worklets, Worker und Speicherpfade.

Sehr niedrige professionelle Audiolatenz, besondere Audiotreiber oder Plugin-Formate wären gegebenenfalls Gründe für einen nativen Audio-Backend-Schritt. Das ist ein eigener technischer Ausbau, keine automatische Eigenschaft eines Desktop-Wrappers.

Sinnvolle Reihenfolge: Datenformat und Ressourcenbesitz festigen → interne Module konsolidieren → optionale Desktop-Hülle über Dateisystem-/Plattform-Adapter. Dieselben Klangkerne und dieselbe Weboberfläche können dabei weiterverwendet werden. Die eigenständige HTML kann parallel als bewusster Veröffentlichungsweg bestehen bleiben.

## Empfohlene nächste Arbeitspakete

1. Archiv-/Snapshot-Defekt beheben und Laden atomar machen.
2. Undo-Speicherbudget und anwendungsweite Ressourcendiagnose einführen.
3. Verbindliche automatisierte Freigabesuite einschließlich echter Speicher-/Lade-Roundtrips etablieren.
4. Häufig geänderte Verwaltungsbereiche in lesbare, begrenzte Module überführen; Klangkerne getrennt erhalten.
5. Kombinierte Live-Dauertests auf Referenzgeräten und mehreren Browsern durchführen.
6. Desktop danach anhand konkreter Dateisystem-, Installations- oder Audio-Anforderungen entscheiden.

Der nächste Reifeschritt ist vor allem Konsolidierung: dieselbe Klangvielfalt mit zuverlässigeren Datenwegen, vorhersehbarem Ressourcenverbrauch und besser prüfbaren Änderungen.
