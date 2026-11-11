# ROOM4-05: Mixdown absichern, Signalweg angleichen, Material-Löschschutz

Basis: ROOM4-04 (`index.html` 8 677 090 B), jetzt 8 680 100 B (+3 010 B). Zone: KALT (Export, Löschdialog); der Live-Audio-Pfad ist unverändert.

| Änderung | Wirkung |
|---|---|
| **Mixdown prüft vorher** (`mixdownMissing`) | Jeder hörbare Clip im Exportbereich muss dekodiertes Audio haben. Sonst bricht der Export ab, schreibt nichts und nennt Clip, Spur und Grund. Stumme Clips/Spuren und Clips außerhalb des Bereichs zählen nicht. Bisher fehlten solche Clips still im Export. |
| **Signalweg wie live** | Der Offline-Mixdown nutzt dieselbe Lane-Kette wie die Wiedergabe (`__xenMaterialLaneChain`: Gain → Pan → Spur-EQ), danach `dispose` des EQ. |
| **Löschschutz** | `__XenMultitrackInbox.usage(id)` zählt Clips und noch nicht platzierte Inbox-Einträge. Löscht jemand ein Material über den kanonischen Owner `__xenDeleteLibraryEntry`, erscheint immer der sichtbare Dialog „Verwendet in: Multitrack · N Clips“ samt Hinweis, dass die Clips ohne Audio bleiben. Ein gemerktes „nicht mehr fragen“ überspringt ihn nicht. Schlägt die Prüfung fehl (z. B. IndexedDB nicht verfügbar), blockiert das das Löschen nicht. |

## Prüfung
- `tests/room4_04_tempo_and_beat.test.cjs`: jetzt 5 Tests (Missing-Prüfung, Löschwrapper). 98 Regressionstests grün.
- PCM-Vergleich Mixdown, `tools/probes/multitrack_mixdown_probe.js`: gleiche Datei (Stereo-Rauschen+Sinus, 32-bit float) auf ROOM4-04 und neu exportiert: **byteidentisch** (SHA-256-Präfix `833a9776cceb945d`, RMS 0,05788, Peak 0,19744). `usage()` in der echten App: 1 Clip bei benutztem, 0 bei unbenutztem Material.
- Roundtrip-Probe ohne Fehler.

## Ehrliche Grenzen
- **Der EQ-Paritätsgewinn ist heute nur strukturell.** Raum IV hat noch keine Oberfläche für einen Spur-EQ (Schlüssel `arrangement:<Spur>` wird nicht aus der Bibliothek geladen und nicht gespeichert). Nachgewiesen ist nur: flacher EQ ändert das PCM nicht. Ein Export mit tatsächlich wirkendem Spur-EQ ist nicht gehört/gemessen.
- Die Fehlermeldung für fehlende Quellen ist per Unit-Test geprüft, nicht im Browser ausgelöst. Der Löschdialog mit Multitrack-Zeile ist nur per Unit-Test mit Stubs geprüft; `tests/library_delete_dialog_enough_ld2_browser.py` ließ sich hier nicht ausführen (kein Python-Playwright).
- Nicht umgesetzt: Anzeige „Verwendet in: Multitrack“ im Inventar der Package Station selbst, vollständiges Multitrack-Projektpaket (`.xenpack`) mit Audiodaten, Live-Wiedergabe meldet ungeladene Quellen weiter nicht.

Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Export-PCM, `usage`). Nicht: Abhören, Gerät, USER_ACCEPTED.
Rollback: Commit ROOM4-04 (`39a8f83`).
