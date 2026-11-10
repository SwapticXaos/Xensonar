# ROOM4-03d: Roundtrip absichern (Plan 2.1 / 2.2 der GPT-Empfehlungen)

Basis: Merge-Stand `c46ea75` (ROOM4-03c + main `f282965`). Zone: KALT (Forge/Editor, Raum-IV-Menü); Wiedergabe und Audio-Graph unverändert.

| Änderung | Datei |
|---|---|
| Schutz: Öffnet ein Multitrack-Clip den WAV-Editor und dieser hält **ungespeicherte** Bearbeitungen (Effektkette oder Undo-Schritte seit der letzten Rückgabe), erscheint eine Rückfrage. Abbrechen behält die Arbeit, es geht zurück nach Raum IV. Kein Dialog bei sauberem Stand und nicht bei Raumwechseln. | `src/rooms/lab.js`, `src/post-oct/015-…` (`hasUnsavedWork`), `033-…` (`cleanRevision` nach Rückgabe) |
| Kontext: Der Editor zeigt links neben den Knöpfen „✂ Multitrack Clip · Track N · Bar B“, nur solange er an einen Clip gebunden ist. | `032-…`, `033-…`, `015-…` |
| Geparkte Bearbeitung: Wer den Forge per Raumwechsel verlässt, ohne zurückzugeben, sah bisher einen ausgegrauten Menüpunkt ohne Erklärung. Jetzt ist er aktiv und nennt den offenen Clip samt Weg („Apply & Return oder Editor schließen“). | `032-…` |

Test: `tools/probes/multitrack_roundtrip_probe.js` erweitert (Wiederöffnen nach Rückgabe ohne Rückfrage, Label, geparkte Bearbeitung, Rückfrage mit Abbruch). Die „ungespeicherten Änderungen“ im letzten Schritt werden per `cleanRevision=-1` simuliert. 97 Regressionstests grün.

Status: CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium). Nicht geprüft: Gerät, Firefox/Safari, USER_ACCEPTED. Offen aus 2.2: Prüfung, ob Spurlautstärke/EQ nicht eingebrannt werden (Clip wird mit gain 1, ohne Fades gerendert – in Code bestätigt, nicht abgehört).
Rollback: Commit `c46ea75`.
