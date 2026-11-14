# PITCH-05 · Thunder Mode Schnellstimmung: Linksklick öffnet den nächsten Regler

Parent: `6a6e47b` (index.html 8 082 481 Bytes). Rollback: `6a6e47b`.
Neu: index.html 8 082 594 Bytes (+113), sha256 `e48026260caef062decefda5413d915ba86aea522c907396c6f388af3cc6cb4a`.
Zone: WARM (Hauptraum-Karten, kein Audio-Pfad). Status: CODE_PRESENT, UNIT_VERIFIED (121/121), BROWSER_CHECKED. Nicht von Hand ausprobiert.

## Problem
In der Schnellansicht der Hold-Karten (Rechtsklick = fretless ±1 Oktave) schloss ein Linksklick auf eine andere Karte nur den offenen Regler. Für den nächsten Ton musste man erst schließen und dann erneut rechts klicken.

## Änderung (`iT` in `src/runtime/instrument/09_monitoring_and_manual_patterns.js`, gilt auch im Hold Pattern Studio)
- Regler offen + Linksklick auf eine ANDERE Karte derselben Reihe: deren Regler öffnet sofort; der Wert der gerade gestimmten Karte bleibt (er wird schon beim Ziehen gespeichert). Die Karte wird dabei nicht ein-/ausgeschaltet.
- Linksklick auf die offene Karte schließt wie bisher; Escape, Klick daneben, Rechtsklick (Wert zurücksetzen) und Enter/Leertaste auf einer Karte unverändert.
- Der Klick-Schließer des Fensters ignoriert die eigene Kartenreihe (sonst würde er den neuen Regler sofort wieder zumachen).

## Test
`tests/e2e/hold_cards_live_edit.cjs` erweitert: Regler Slot 2 stimmen, Linksklick Slot 4 öffnet dessen Regler (Position auf Slot 4, Wert Slot 2 erhalten, Slot 4 nicht umgeschaltet), Slot 4 stimmen, Linksklick auf offene Karte schließt, Klick daneben schließt. Alle früheren Prüfungen der Datei weiter grün; hold_pattern_plan, hold_plan_factory, hold_library_shared, live_click_during_hold grün.

## Offen
- Nur eine Karten-Reihe zurzeit: Ein Linksklick auf eine Karte einer anderen Reihe (z. B. anderer Lane) schließt den offenen Regler und schaltet die Karte wie üblich.
- Auf dem Parent nicht gesondert rot gefahren (das Alt-Verhalten war das Schließen per Linksklick).

## Nachtrag PITCH-05b · Rechtsklick auf ein anderes Kärtchen
Gemeldet: Nach ein paar Schritten setzte ein Rechtsklick auf das nächste Kärtchen den offenen Regler auf 0, statt den neuen zu öffnen.
Ursache: der Fenster-Handler `resetOnContextMenu` (PITCH04) fing jeden Rechtsklick in der App ab, setzte den offenen Slot auf 0 und stoppte das Ereignis, bevor das neue Kärtchen reagieren konnte.
Jetzt: Rechtsklick auf ein ANDERES Kärtchen derselben Reihe öffnet dessen Regler und lässt die Stimmung des offenen Slots stehen (beliebig oft hintereinander). Rechtsklick auf das offene Kärtchen, auf seinen Regler oder irgendwo außerhalb setzt weiter diesen Slot auf 0; Linksklick außerhalb schließt und behält den Wert.
Test (`hold_cards_live_edit`): Kette über 5 Kärtchen (Regler sitzt jeweils auf dem Kärtchen, alle früheren Werte bleiben), Rechtsklick auf das offene = 0 bei offenem Regler, Linksklick außerhalb schließt. Auf dem Stand davor rot (Regler wandert nicht auf das neue Kärtchen).
index.html 8 082 594 → 8 082 843 Bytes (+249 gegenüber PITCH-05, sha256 `7c8d2dd6fe22120e5bf989ccf7093c4a4a1b6b2fc979ca3b6af1b89aa1459cfa`). Rollback: `862481a`.
Hinweis zum Test: Locator-Klicks scrollen vorher, und ein Scroll schließt das Lineal per Design; deshalb klickt der Test mit Mauskoordinaten.
