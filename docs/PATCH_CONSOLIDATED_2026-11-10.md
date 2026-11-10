# Konsolidierter Stand 10.11.2026 (Forge Voices 01, SFPNG01, Thunder HPM02, NATIVE-CLOCK-FIX02) + Aufräumen

Eingang: `XenSonar_ROOM4-06_FORGE-VOICES-01_SFPNG01_THUNDER-FIX02_CHERRYPICK_CONSOLIDATED.zip` (HTML `129a84a5…`, 8 812 441 B) mit Audit und Herkunftsdatei.

## Übernahme in die Quellen
Die HTML enthielt meine Stände ROOM4-03d bis 06 bereits (alle Marker und Funktionen in gleicher Zahl). Die 94 Unterschiede zu meinem Build wurden mit einem Werkzeug (Zeilen-Diff, Zuordnung jedes Bereichs zu seiner Quelldatei) in 22 Quelldateien übertragen. Ergebnis: **der Build der Quellen ist byte-identisch zur Lieferung** (`129a84a5…`). Drei Stellen, an denen eine gebaute Zeile über eine Dateigrenze ging, wurden Token für Token aufgeteilt. Das Werkzeug lag nur im Arbeitsordner, nicht im Repo.

## Durchlauf
- Syntax (33 Skriptblöcke): ok. Regressionstests: anfangs 97 von 99; zwei Test-Gerüste kannten neue Hilfsfunktionen nicht und wurden ergänzt (`thunder_q01_gesture_quantize`: Slot-/Micro-Hilfen; `test_stamp_figure_p37`: Stub für `__ForgeVoices`). Jetzt **99 von 99**.
- Browser-Proben auf der Lieferung ohne Fehler: Multitrack, Send-Wege, Roundtrip, Tempo, Package-Inventar, Q-Knopf. Mixdown-PCM der Testdatei unverändert (`833a9776cceb945d`).
- Nicht erneut geprüft: alles, was der Audit selbst als offen nennt (Hörtest Nodal/Tröödle, Enter und Keyboard gleichzeitig, ungerade Slotzahlen, PCM/DSP-Wechsel, Drum-Phase). FIX02 ist im Donor als PROVISIONAL markiert. SFPNG01-Roundtrip mit zwei Browsern nicht wiederholt.

## Aufgeräumt
- Im Seitenkopf klebten zwei Meta-Zeilen in einer Zeile; getrennt (+1 Byte, `index.html` jetzt 8 812 442 B).
- `echo3.png`, `echo4.png`, `shot.png` lagen unreferenziert im Hauptverzeichnis; nach `evidence/screenshots/` verschoben (nichts gelöscht).

## Beobachtungen, nicht geändert
- Das neue Hold-Pattern-Skript (HPM01, rund 10 KB) und seine Styles stehen fest im Seitenkopf. Es öffnet seine Datenbank erst bei Gebrauch, wird aber beim Start geparst. Nach dem Heiß/Kalt-Vertrag wäre Lazy-Laden besser.
- Die neue Datenbank `xensonar-thunder-hold-patterns-v1` fällt in der Package Station unter „Weitere XenSonar-Datenbanken“; vollständige Exporte enthalten sie, Teil-Exporte nur mit dieser Rubrik. Eine eigene Rubrik wäre sinnvoll.
- Seitentitel trägt weiter „W31 AF01+ML01+KH04 … QA“.
Rollback: Commit `f6bfb5e` (ROOM4-06).
