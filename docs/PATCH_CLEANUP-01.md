# CLEANUP-01 · Titel, Herkunfts-Meta, Statusdatei, Wegweiser

Parent: `68ce285` (`index.html` 9 136 373 Bytes, sha256 `0d3f6fb07bc03c671a5188ab3c9e7e67e7e1a81d66f9e03e52d00d0f05d35ba3`). Rollback: `68ce285`.
Neu: `index.html` 9 132 733 Bytes, sha256 `4ba72a5af1077e2008fc255ed8f6ea6d68b9585f157f3b32a0ab00ce80479d65` (**−3 640 Bytes**).
Zone: keine (nur `<head>` der Seite und Begleitdateien; kein Skript, kein Audio, keine Daten).
Status: CODE_PRESENT, BROWSER_CHECKED (Chromium headless). Nicht an einem Gerät gesehen.

- **Tab-Titel:** `XenSonar` statt „XenSonar W31 AF01+ML01+KH04 – Keyboard Hold Factory 16/1 + troodle/EQ · QA“. Das war ein Stand-Name aus den GPT-Sitzungen, kein Produktname.
- **29 `<meta name="xensonar-…">`-Zeilen** aus der ausgelieferten Datei genommen (Patchnamen, „QA-pending“, Eltern-SHA-256 alter Stände). Kein Code und kein Test hat sie gelesen. Wortgetreu archiviert in `docs/provenance/HTML_META_2026-11-13.md`. Behalten: `charset`, `viewport`.
- **`docs/SOURCE_TREE_STATUS.json`** nachgeführt (368 Dateien, vorher 365): 6 neue Dateien eingetragen (Mehrspur, Psy Lab, Stem-Recorder, zwei Hold-Pattern-Fabriken: alle `post-oct`), 8 Dateien von `oct-identical` auf `oct-evolved` gesetzt, weil sie sich seit dem 09.11. geändert haben (Vergleich mit dem Erzeugungs-Commit `08ca3c7`), Größen aktualisiert. Der Oktober-Quellbaum selbst liegt nicht im Repository; `tools/analysis/tree_status.py` lässt sich deshalb hier nicht erneut ausführen.
- **Neue Wegweiser:** `docs/README.md` (welche Frage, welches Dokument), `tests/README.md` (was läuft wo; Alt-Bestand; Warnung vor dem Verschieben von Helfer-Dateien).
- **Bewusst nicht gemacht:** Alt-Tests verschieben oder löschen (einige sind Helfer aktiver Tests; ohne Nutzen für die App), ruhenden XMEM-/Diagnose-Code aus der Auslieferung nehmen (eigener Patch mit Messung, siehe Audit Befund 10), Lösch-Aufräumen in `evidence/` und `docs/`.

Tests: `build.py --check` OK, `run_tests.sh` 119/119; `storage_persistence`, `package_fixture_import`, `package_import_roundtrip`, `session_persistence`, vier Standalone-Browsertests und `engine_smoke` (Chromium) grün.
