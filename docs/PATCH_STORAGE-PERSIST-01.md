# STORAGE-PERSIST-01 · Browser-Speicher schützen, Paket-Beispiel einfrieren, Firefox-Rauchtest

Parent: `5abde27` (Audit; `index.html` sha256 `9057d665a4ea2dc27b3cc9c79e94122f28e8a3ad93546c20432472827ee9130b`, 9 133 617 Bytes). Rollback: `5abde27`.
Neu: `index.html` 9 136 373 Bytes (**+2 756 Bytes**).
Status: CODE_PRESENT, BROWSER_CHECKED (Chromium headless, Antworten des Browsers simuliert). **Nicht gehört** (kein Audio berührt), nicht auf einem echten Gerät bedient, Firefox-Job noch nie gelaufen.
Anlass: `docs/AUDIT_2026-11-13.md`, Befunde 2 bis 4.

## 1 · Browser darf die Daten nicht mehr von selbst löschen (Zone KALT)
**Problem:** Sessions, Samples, Instrumente und Aufnahmen liegen in `localStorage` und IndexedDB. Ohne Anforderung darf der Browser sie bei Platzmangel löschen. Die App hat nie um dauerhaften Speicher gebeten.
**Änderung:**
- `__xenStoragePersistence` (`src/post-oct/gaps/010-main-bundle__14_after_02_rfl_worklet.js`, neben dem Long-Master-Speicher): `ask()` ruft `navigator.storage.persist()` auf, falls noch nicht gewährt; `status()` liest `persisted()` und `estimate()`. Schreibt nichts in den Speicher, wirft nie, fragt höchstens einmal je Seitenaufruf (der Knopf unten erzwingt eine neue Anfrage).
- Gefragt wird nur nach einer Nutzeraktion: beim Öffnen von **Saved content · Package Station** (Inventar) und beim Start einer Master-/Stem-Aufnahme (`__xenLongMasterPCM.create`). Beim Start der App und im Spiel passiert nichts.
- Das Inventar zeigt eine Zeile: grün „Browser storage is protected…“, oder gelb „not protected: the browser may delete it when disk space runs low. Export a Workspace Package…“ mit Knopf **Ask the browser to protect it**; dazu „83 MB of 3.7 GB used“. Browser ohne die Funktion: eigener Hinweis.
**Was der Browser daraus macht** (nicht von uns steuerbar): Chromium entscheidet selbst (Nutzungsdauer, Lesezeichen, Installation), Firefox fragt den Nutzer. Eine abgelehnte Anfrage bleibt abgelehnt; die gelbe Zeile erinnert dann an den Paket-Export.
**Test:** `tests/e2e/storage_persistence.cjs` (vier Fälle: schon geschützt = keine Anfrage, gewährt, abgelehnt mit Knopf, Browser ohne Funktion; Wiederöffnen fragt nicht erneut). Auf dem Parent rot.
**Daten-Owner:** keiner; es werden keine Daten gelesen oder verändert.

## 2 · Eingefrorenes Paket als Testbeispiel
**Problem:** `.xenpack` lässt sich nur importieren, wenn alle Datenbanken Version, Stores und Indizes wie im Paket haben. Die nächste Schema-Änderung hätte alte Pakete unlesbar gemacht, ohne dass ein Test es bemerkt (der Roundtrip-Test erzeugt sein Paket jedes Mal neu).
**Änderung:** `tests/fixtures/xenpack/xensonar_2026-11-13.xenpack` (9,7 MB, mit Git ca. 150 KB, weil fast nur Nullen) wurde mit dem Stand vom 13.11. aus der echten App erzeugt: zwei Sessions mit Bass-Klangfarbe und Drone-Einstellung. `tests/e2e/package_fixture_import.cjs` importiert es in ein leeres Profil und prüft, dass die App wieder startet und beide Sessions mit ihren Werten da sind. Die Datei ist per SHA-256 gesichert.
**Gegenprobe (gemacht):** In einer Testkopie wurde die Version einer Datenbank angehoben: Der Test wird rot mit „…Speicherschema unterscheidet sich… an import migration is needed before this storage change ships“. Die App selbst stellt dabei den vorherigen Stand wieder her (Hinweisfenster „Import nicht abgeschlossen“).
**Neues Beispiel erzeugen** (z. B. vor einer Schema-Änderung): `XEN_WRITE_FIXTURE=1 node tests/e2e/package_fixture_import.cjs dist/XenSonar_PROBE.html` legt eine neue Datei `…new.xenpack` an und überschreibt nie.
**Noch nicht gebaut:** Die Migration beim Import selbst. Sie wird erst gebraucht, wenn eine Datenbank tatsächlich eine neue Version bekommt; der Test sagt dann Bescheid. Alte Beispiele bleiben im Ordner und können später zusätzlich geprüft werden.

## 3 · Firefox-Rauchtest
**Änderung:** `tests/browsers/engine_smoke.cjs` (Start, Power an, AudioContext läuft, alle fünf Räume betreten und verlassen, genau ein AudioContext, keine unbehandelten Seitenfehler) für Chromium, Firefox und WebKit (`XEN_BROWSER=…`). In `.github/workflows/build-check.yml` neuer Job `firefox-smoke`, **nicht blockierend** (`continue-on-error`), bis die ersten Ergebnisse bekannt sind.
**Geprüft:** Der Test läuft in Chromium grün. **Firefox konnte in der Entwicklungsumgebung nicht installiert werden** (Download gesperrt); der Job ist also ungetestet. Ein roter Job beim ersten Lauf ist möglich und wäre dann eine echte Information über Firefox oder ein Fehler im Test.

## Tests
`./tools/run_tests.sh` und `build.py --check` grün; neue E2E-Dateien laufen in `./tools/run_e2e.sh` automatisch mit.

## Offene Risiken
- Nicht an einem echten Gerät gesehen; wie Opera/Chromium des Nutzers die Anfrage beantworten, ist offen (Dialog oder stilles Nein).
- Das 9,7-MB-Beispiel liegt im Arbeitsordner; bei Platzproblemen kann es neu und kleiner erzeugt werden (der Hauptteil sind leere Standardpuffer).
