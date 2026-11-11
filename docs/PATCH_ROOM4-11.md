# ROOM4-11: Spur-EQ (XenSonar-EQ pro Spur, im Projekt gespeichert)

Basis: ROOM4-10 (`index.html` 8 854 283 B), jetzt 8 858 295 B (+4 012 B, im lazy geladenen Raum-IV-Chunk). Zone: WARM (Bedienung), der EQ-Editor selbst ist der vorhandene (`__XenEQPanel`, nichts dupliziert).

- **Bedienung:** Spur wählen → Leiste „FX · Spur“ → `EQ`. Es öffnet sich das bekannte XenSonar-EQ-Fenster (zwei Kurven A/B zeichnen, Morph, adaptive oder Raster-Bänder, Hold, Muster). Der Spurkopf zeigt „· EQ“, der Knopf „EQ ●“, solange die Spur einen EQ hat.
- **Daten-Owner:** Das **Projekt** besitzt die gespeicherte Kurve (`track.eq`). Der gemeinsame EQ-Zustand unter dem Schlüssel `arrangement:<Spur-ID>` ist nur die Live-Kopie: Das Projekt füllt ihn (beim Laden, bei Undo, Spurkopie), Änderungen im Fenster werden nach 250 ms Ruhe ins Projekt zurückgeschrieben und gespeichert. Dadurch überlebt der EQ Neustart, Package-Station-Export/-Import (Rubrik „Multitrack-Arrangement“) und ein neues Browserprofil. Bisher wurde dieser Schlüssel nicht aus dem Browserspeicher geladen.
- **Ein flacher EQ wird nie gespeichert** (alte Projekte unverändert, Spuren ohne EQ bleiben ohne `eq`). Ein ausdrücklich ausgeschalteter EQ bleibt gespeichert.
- **Undo:** EQ-Änderungen sind keine Verlaufsschritte; ein Undo anderer Dinge rollt den EQ nicht zurück (`keepEq`). Der EQ hat sein eigenes Fenster.
- **Wiedergabe und Export** nutzen dieselbe Spur-EQ-Kette wie seit ROOM4-05; dort wirkt jetzt wirklich eine Kurve.

## Prüfung
- Unit-Test: Speicherform, flach = nichts, Müll/zu große Kurven verworfen, Bereiche begrenzt, Rundlauf (`eqPick`).
- Echte App (`tools/probes/multitrack_eq_probe.js`, zwei Töne 220 Hz + 3520 Hz im Export gemessen): Fenster öffnet (2 Zeichenflächen), über die ganze Breite gezeichneter Cut wird gespeichert (Kurve −0,99), **Export −35,8 dB bei beiden Tönen**, Strg+D/Strg+Z lässt den EQ stehen, **nach Neuladen der App derselbe Export (−35,8 dB)**, keine Fehler. Der Standard-Export ohne EQ bleibt byte-identisch (`833a9776cceb945d`). 99 Regressionstests grün.

## Grenzen
- Nicht abgehört; gemessen wurde nur ein flacher, tiefer Cut. Selektive Kurven (Tiefen anheben, Mitten absenken) nutzen denselben Pfad, sind aber nicht einzeln gemessen.
- Der Live-Raum-EQ-Zustand im `localStorage` enthält auch die Schlüssel der Spuren (harmlos, wird beim Laden verworfen). Eine gelöschte Spur lässt dort einen Eintrag zurück.
- Das Zusammenspiel mit der Package-Station-Wiederherstellung in ein leeres Profil ist nicht erneut als Rundlauf mit EQ getestet; der Mechanismus (Projekt füllt den EQ beim Laden) ist derselbe wie beim Neuladen.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED. Nicht: Abhören, Gerät, Firefox/Safari, USER_ACCEPTED. Rollback: Commit `91d2433` (ROOM4-10).
