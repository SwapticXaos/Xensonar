# Konsolidierung nach dem Gesamt-Audit

Basis: `1179508dd99029be58554fc343a1ac4b9f781ae3`.
Build: `Xensonar_N21_F2_Consolidation_Test.html`, 5.583.388 Bytes,
SHA256 `447f01c5ccd2385e665d00c7fc4b2e2fb463d9a890510dfc6d5d99100446620c`.

## Abgeschlossene Schritte

### 1. Vollständiger Forge-Snapshot im Workspace-Paket

Der generische Archiv-Replacer bleibt absichtlich konservativ. Das neue Modul `src/storage/05_project_snapshots.js` schützt Projekt-Daten ausdrücklich vor dessen Binär-Auslassung und Zahlenlisten-Kürzung:

- typisierte Arrays als versionierte Base64-Daten mit Typ und Länge;
- lange Listen in verlustfrei zusammensetzbaren kleinen Blöcken;
- rekursiver Erhalt zusätzlicher Projektfelder, einschließlich Body und Stempel-Metadaten;
- Prüfung von Array-Längen, maximaler Schachtelung und einem 256-MiB-Datenbudget pro Codec-Aufruf;
- vollständige kurze Vorschauen aus älteren Paketen sind wiederherstellbar; tatsächlich ausgelassene Daten werden nicht mit erfundenen Nullen ersetzt.

Die alten Raster-/Quell-Audio-/Stempel-Codec-Felder behalten ihre bisherigen Formate. `oLe` und `iLe` binden den neuen Codec für die übrigen Snapshot-Felder ein.

Vorher reproduziert: Export mit `AQ(oLe(record))`, Import mit `iLe`, Laden mit `loadProjectSnapshot` endete bei `bodyMass.slice`.
Jetzt nachgewiesen: Raster, Grain, alle acht Body- und Stempel-Arrays sowie Detune bleiben nach diesem Weg erhalten; Array-Typen, Teilansichten und lange Kurven ebenfalls.

### 2. Vorbereitung vor Änderung des aktiven Arbeitsstands

Der Loader prüft Raster- und Body-Dimensionen, alle numerischen Raster-/Body-Werte und erforderliche Projektstrukturen. Er bereitet normalisierte Einstellungen und vollständige Body-Kopien vor. Erst danach ändert er den aktiven Arbeitsstand. Eine vorab fehlgeschlagene Fractalia-Speicherung lässt Transport und Raster ebenfalls intakt.

Das ist eine Absicherung gegen fehlerhafte Snapshot-Daten. Es ist **keine verteilte Transaktion über sämtliche Browser-Datenbanken eines kompletten Workspace-Pakets** und keine Garantie gegen Prozessabbruch oder Speichermangel des Betriebssystems. Bibliotheksimport, asynchrone Donor-Wiederherstellung und plötzlicher Browserabbruch bleiben eigene Lebenszyklusbereiche.

### 3. Ein gemeinsamer Speichervertrag für Undo und Redo

`src/storage/06_history_budget.js` zählt eindeutig gehaltene ArrayBuffer, geteilte Teilansichten nur einmal, Blob-/AudioBuffer-Daten und konservative Verwaltungsanteile. Es traversiert keine PCM-Samples zur Messung und erzeugt dabei keine PCM-Kopie.

Beide Verlaufsrichtungen teilen sich 192 MiB und höchstens 30 Schritte. Beim Umschichten bleibt die neu hinzugefügte Gegenrichtung bevorzugt erhalten; zuerst entfallen ältere Schritte. Ein Eintrag, der alleine das Budget überschreitet, wird nicht behalten. Die aktuelle Komposition wird dadurch nicht verkleinert und ihre Klangerzeugung nicht geändert. Das Budget begrenzt den gehaltenen Verlauf; kurzfristige Kopien beim Erfassen/Wiederherstellen und andere Anwendungscaches kommen hinzu.

Der Test mit sieben vollständigen Body-Schritten hält vier Schritte bei rund 160 MiB Array-/Verwaltungsdaten. Undo stellt Raster und Body von 0,7 auf 0,6 zurück; Redo stellt beide wieder auf 0,7. Geteilte Buffer werden zusätzlich mit kleinen kontrollierten Fällen geprüft.

`getHistoryUsage()` liefert Bytes, Budget und Anzahl beider Stapel. Das ist eine konservative Retentionsrechnung, keine Messung des vollständigen JavaScript-Heaps und kein globales Audio-Speicherbudget.

### 4. Wiederholbare Freigabe

- `npm run test:consolidation`: 13 Host-Prüfprogramme plus Build-Verifikation.
- `npm run test:consolidation:browser`: drei native Chromium-Prüfprogramme plus Build-Verifikation.
- `npm run verify:release`: beide Gruppen.
- `.github/workflows/consolidation.yml`: getrennte Host-/Chromium-Jobs mit Ergebnis-Artefakten.

Zusätzlich bestanden alle 65 Prüfungen des vollständigen N21-Host-/DSP-/Worker-Durchlaufs sowie die Merge- und Granular-Hold-Gruppen.

Die Hostgruppe umfasst Archiv-Roundtrip, defekte Daten, simulierten Speicherfehler, Verlauf, Struktur-/Quellschutz, aktuellen Source-Index, Pitch-Space, Maschinenauswahl, Render-Jobs, RFL-Lebenszyklus, Nodal-Envelope-Nullpunkt, Raster-Mute, Hotkeys, Mikrofon-Lebenszyklus und Audio-to-Carrier-Signalanalyse.

Der neue Browsertest lädt ein reales Paket herunter, importiert die Datei in einem frischen Browserprofil, öffnet den aus IndexedDB wieder eingelesenen Forge-Arbeitsstand und spielt ihn ab. Er prüft außerdem, dass ein fehlerhafter Snapshot laufende native Wiedergabe nicht unterbricht. Die ergänzenden vorhandenen Browsertests prüfen grüne Play-Bereitschaft sowie Malen/Morph/Detune bei allen acht Carrier-Maschinen.

Diese Prüfprogrammzahlen sind keine Code-Coverage-Angabe. Es wurde kein physisches Mikrofon/Audiointerface und kein Firefox-, Opera- oder Safari-Dauertest durchgeführt. Die GitHub-Workflowdatei ist eingerichtet; lokale erfolgreiche Läufe sind kein Nachweis eines bereits erfolgreichen entfernten Actions-Laufs.

## Begrenzung der Änderungen

Drei bestehende Anwendungsdateien ändern ausschließlich die Funktionen `oLe`/`iLe`, `yDe` und `PDe` sowie die bisherige Konstante `kDe`. Zwei lesbare Verwaltungsmodule kommen hinzu. Alle übrigen Quell- und Style-Dateien sind gegen die vorherige Veröffentlichung unverändert geprüft. Keine Synthese-, Envelope-, Mischer-, RFL-, Entrophon-, Nodal- oder Drone-Klangverfahren wurden vereinheitlicht oder ersetzt.

`tests/consolidation-preservation.cjs` vergleicht die Syntaxstruktur außerhalb dieser Funktionen mit eingefrorenen Prüfsummen. Zusätzliche exakte Prüfsummen fixieren die fünf freigegebenen Dateien. Historische Release-Prüfungen verwenden eine gemeinsame Kompatibilitätshilfe, die zuerst diesen neuen Strukturvertrag prüft. Die ursprünglichen Baseline-Dateien bleiben unverändert; eine generelle Hash-Ausnahme existiert nicht.

Die zwei bestehenden Browser-Prüfprogramme akzeptieren zusätzlich `XEN_CHROMIUM_PATH`, damit dieselben Prüfungen lokal und in CI laufen.

## Nachweise

Aktuelle Läufe: `results/consolidation/host-validation.*`, `browser-validation.*`, `browser.json`, `forge-ready-browser.json`, `forge-pitch-browser.json`. Zusätzliche Regressionsergebnisse werden unter `regression-output/` archiviert; frühere Ergebnisdateien werden bei der Lieferung wiederhergestellt.

## Bewusst offen für die nächste Etappe

1. Verlauf mit Kachel-/Delta-Snapshots und strukturell geteilten unveränderten Body-Ebenen; dadurch mehr Schritte bei gleichem Budget und weniger kurzfristige Kopien.
2. Anwendungsweite Ressourcenübersicht und Prioritäten über Verlauf, Hör-/Hybrid-Caches, Raw-Audio und aktive Stimmen hinweg. Das neue Verlaufsbudget ersetzt dies nicht.
3. Vollständige Validierung und transaktionale Rückabwicklung aller Bibliotheksbereiche beim Paketimport, einschließlich später asynchron geladener Donoren.
4. Große Archivkonvertierungen nach Messung gegebenenfalls in Worker verlagern.
5. Weitere Verwaltungsbereiche schrittweise in lesbare Module überführen; Klangmechanismen getrennt erhalten.
6. Referenzgeräte, kombinierte Live-Dauerszenarien, mehrere Browser und physische Hör-/Audiointerface-Tests.
7. Desktop-Plattformadapter erst bei konkretem Dateisystem-, Installations- oder Audio-Bedarf.
