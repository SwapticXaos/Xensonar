# ROOM4-06: Package Station kennt das Multitrack-Arrangement

Basis: ROOM4-05b (`index.html` 8 685 043 B), jetzt 8 686 526 B (+1 483 B). Zone: KALT (Package Station, Archiv). Daten-Owner: Raum IV (IndexedDB `xensonar-multitrack-v1`) und Materialbibliothek. Die Package Station schreibt nichts außer beim ausdrücklichen Export/Import.

| Änderung | Wirkung |
|---|---|
| **Eigene Rubrik „Multitrack-Arrangement“** (Gruppe Projekte & Arbeitsstände) | Der Datenbank `xensonar-multitrack-v1` (Arrangement und noch nicht platzierte Inbox) war bisher nur unter „Weitere XenSonar-Datenbanken“ erreichbar. Jetzt gezielt wählbar (27 statt 26 Rubriken). |
| **Abhängigkeiten automatisch** | Die bestehende Referenzhülle zieht die benutzten Materialien mit. Ein Export nur des Arrangements enthält sein Material; ein Export nur der Materialien enthält das Arrangement nicht. |
| **Inventar („Auge“)** | Material-Zeilen zeigen „Used in: Multitrack · N Clips“ (liest das Arrangement nur lesend). Löschen bleibt über den kanonischen Owner; dort warnt der Dialog aus ROOM4-05. |

## Prüfung (echte App, Headless-Chromium)
- `tools/probes/multitrack_package_probe.js`: Zeilen „Used in: Multitrack · 2 Clips“, Rubrik „Multitrack-Arrangement“, Referenzhülle wie oben.
- `tools/probes/multitrack_package_roundtrip_probe.js`: Profil A baut ein Arrangement (2 Clips), exportiert **nur** die Rubrik Multitrack (396 KB). Leeres Profil B importiert nach Bestätigung der Rückfrage: Arrangement (2 Clips, 108 BPM), gleiche Material-ID, Audio dekodiert (Clip-Info „Stereo · 48 kHz · 00:02.0“).
- Tests `test_package_selection_contract_p41` und `test_package_station_selection_p41` auf 27 Rubriken angepasst und grün. 99 Regressionstests grün.
- `test_package_station_outputs_p4`, `…independent_p3_13`, `…large_p4` sind in dieser Umgebung rot, auf dem Vorgänger ebenso (unverändert).

## Grenzen
- Vollständige Exporte enthielten das Arrangement schon vorher; neu ist die gezielte Wahl und die Anzeige.
- Pakete, die mit Auswahl „Weitere XenSonar-Datenbanken“ erstellt wurden und Multitrack-Daten enthalten, stellen diese bei Teil-Wiederherstellung nun unter „Multitrack-Arrangement“ her. Raum IV ist wenige Tage alt, solche Pakete sind unwahrscheinlich, aber nicht ausgeschlossen.
- Ein vorhandenes Arrangement im Zielbrowser wird beim Import ersetzt (wie jede gewählte Rubrik). Konfliktprüfung zwischen zwei Arrangements gibt es nicht.
- Nicht geprüft: Abhören, große Projekte, Firefox/Safari, USER_ACCEPTED.
Status: CODE_PRESENT, BROWSER_CHECKED. Rollback: Commit `1805cb1`.
