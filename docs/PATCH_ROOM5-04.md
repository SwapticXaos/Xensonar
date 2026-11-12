# ROOM5-04 · Ansicht und Tasten entkoppelt, Richtungsschalter, große Spielfläche, Wortwahl (12.11.2026)

Parent: ROOM5-03 (`b4196ee`), `index.html` 9 019 102 B, SHA-256 `2e6c1d15322fd4fca4db88d3a1b7cfadf528ec61f8d73ce33677bfb940759491`.
Ergebnis: `index.html` 9022585 B, SHA-256 `08ab712d55f163b5ee10ab9fac52cb434767396e1a49856656d466502f231b17` (+3483 B, alles im Raum-Chunk). Rollback: `b4196ee`.
Status: CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium). **Nicht:** abgehört, USER_ACCEPTED, Firefox/Safari, Netlify.

## Wortwahl (Korrektur)
„Home Row“/„Grundreihe“ habe ich erfunden. Das Programm nennt die Reihe A–# im Live-Raum **Keyboard Extension** („Three pitch rows: 1–0 · Q–P · A S D F G H J K L Ö Ä # · 32 positions“). In Raum V gibt es **keinen eigenen Schalter** dafür: hier liegen keine Loops oder Slots auf den Buchstaben, also spielen immer alle drei Reihen, 32 Positionen. Der Hinweistext im Raum benutzt genau die Formulierung des Live-Raums; Berichte und Tests sind bereinigt.

## Tasten und Bild sind jetzt getrennt
Fehler aus ROOM5-03: Die Piano-Ansicht hatte die Tasten mitgespiegelt (Taste 1 wurde zur tiefsten Stufe). Jetzt gilt: **Ansicht und Richtung verändern nur das Bild und den Zeiger, nie die Tasten.** Getestet: Taste 1 spielt in Hauptraum- und Piano-Ansicht dieselbe Frequenz.
Drei voneinander unabhängige Schalter in der Leiste:
| Schalter | Wirkung | Vorgabe |
|---|---|---|
| **View: Main Room ↕ / piano ↔** | Tonachse senkrecht oder waagerecht | Main Room |
| **Pitch: high on top / low on top** (bei Piano: low / high on the left) | Richtung der Tonachse im Bild und beim Zeiger umdrehen | hoch oben bzw. tief links |
| **Keys: high → low / low → high** | Richtung der Tasten (die Tastenspiegelung des Live-Raums): bei „high → low“ spielt Taste 1 die höchste Stufe des Tastenfensters (wie im Hauptraum), bei „low → high“ die tiefste (wie ein Klavier) | high → low |
Alle drei werden gespeichert.

## Tastaturen: Deutsch / Englisch
Unter dem Pad sitzen die Knöpfe **German / English**. Es ist **dieselbe Einstellung wie im Live-Raum** (`__XenKeyboardLayout`, ein Besitzer): Sie ändert nur die dritte Reihe (A–# bei deutscher, A–/ bei englischer Tastatur; Tastencodes `Backslash` bzw. `Slash`). Zahlenreihe und Q-Reihe verhalten sich wie im Live-Raum. Getestet: Englisch → Taste „/“ ist Position 32, Deutsch → Taste „#“ ist Position 32.

## Große Spielfläche
Schalter **Large view**: Das Pad nimmt die volle Breite (höchstens 82 % der Fensterhöhe, Seitenverhältnis bleibt), **alle Regler und die Raster-Steuerung wandern darunter** (getestet: Regler-Block beginnt unter dem Pad). Die Zeichenflächen (Pad und Mandala) passen ihre Auflösung der angezeigten Größe und der Bildschirmdichte an (1, 1,25 oder 1,5 fache Pad-Einheiten), das Mandala bleibt dadurch auch groß scharf (Test: Zeichenfläche breiter als 1100 in der großen Ansicht). Last Headless (Software-Raster) in der großen Ansicht: Hauptthread 51 %, Stufenautomatik wie bisher.

## Prüfungen
Neu/erweitert in `room5_psylab`: Ansicht ändert Tasten nicht; Richtung umdrehen (Piano: rechts tief; Hauptraum: tief oben); Tastenrichtung low → high; Deutsch/Englisch; kein Extension-Schalter; große Ansicht (Breite, Regler darunter, Auflösung, Spielbarkeit); Speicherung. `run_tests.sh` 110/110, `build.py --check` OK, Browser-Test `room5_psylab` grün auf genau diesem Stand; der Gesamtlauf `run_e2e.sh` lief bei Commit noch (Ergebnis folgt im Nachtrag unten).

## Offen
- Fensterverschiebung (`[` / `-`) in Kombination mit beiden Tastenrichtungen ist nur über die vorhandene Live-Funktion geprüft, nicht über alle Kombinationen.
- Nicht geprüft: Firefox, Safari, Netlify, kein Abhörtest.

## Nachtrag Gesamtlauf
`run_e2e.sh` auf Stand `562a48f`: 19 Läufe grün, kein Fehler, Exit 0 (u. a. `room5_psylab`, `room5_grid_layer_equivalence`, `room5_metronome_not_recorded`, `live_grid_handles`, Bass-, Session- und Package-Läufe, P37).
