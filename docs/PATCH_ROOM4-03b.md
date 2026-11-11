# ROOM4-03b: Korrektur Forge-Rack und Raum-IV-Navigation

Nutzer-Rückmeldung zu ROOM4-03, mit Screenshot des eigenen Layouts:

1. **Forge-Rack:**
   - Das Rack darf nicht nach unten wachsen. In ROOM4-03 entstand eine lange leere Zeile, und „Send to Pink Track“ war nach unten versetzt.
   - „Send to Multitrack“ soll oben und unten mit den anderen Send-Knöpfen fluchten.
   - Figure Projects wird an der x-Position gekürzt, an der das Project-Name-Feld endet, und in die Lücke darüber geschoben.
   - Beide beginnen mit gleichem Abstand zu IMPORT AUDIO.
   - Das „geordnete Chaos“ soll kompakt bleiben.
2. **Raum IV, vertikal:**
   - Es gab eine doppelte Scroll-Logik: den nativen Scrollbalken plus die Leiste. Gewünscht ist nur **eine** Leiste.
   - Ihre Länge ergibt sich aus der Spurzahl.
   - Ganz aufgezogen müssen alle Spuren sichtbar sein; verkleinert bis auf **eine** Spur. Die bisherige feste Grenze (36–220 px) bremste das aus.
3. **Raum IV, horizontal:** Statt Zoom-Regler plus Scrollbalken gibt es **eine** Leiste wie in Melodic Loop: ziehen = scrollen, Kanten = zoomen.

| | |
|---|---|
| Basis | ROOM4-03, `index.html` 8 654 665 Bytes, SHA-256 `294a67526cbd0bd039aadb084291074cbb4403310aab7a3c09f646e4ce180b3c` (Commit `487f61f`) |
| Ergebnis | `index.html` 8 663 162 Bytes, SHA-256 `e00039c379858b6f231fbdff5b7b1c84b39963aa1a341934e83ab2cda5667653` |
| Größenzuwachs | +8,5 KB gegenüber ROOM4-03, fast alles im inerten Raum-Chunk. Im Hauptbundle: Leisten-Helfer (+0,3 KB), Rack-CSS (+1,2 KB) und ein Effekt im Save-Feld. |
| Zone | **KALT / Oberfläche.** Zoom und Spurhöhe sind Ansicht, keine Bearbeitung: Sie erzeugen keinen Undo-Schritt, keinen Audio-Abgleich und werden erst in Ruhe gespeichert (600 ms). Die Wiedergabe ist unverändert. |
| Daten-Owner | Unverändert. Spurhöhe und Zoom liegen wie bisher im Raum-IV-Projekt (`xensonar-multitrack-v1`); nur ihr erlaubter Bereich ist größer. |
| Status | CODE_PRESENT, BROWSER_CHECKED (Headless-Chromium). Nicht: Gerätetest, Firefox/Safari, USER_ACCEPTED. |

## Forge-Rack

- **„Send to Multitrack“ steht in der Send-Reihe:** 36 px hoch, gleiche Ober- und Unterkante (gemessen: identische y-Werte bei allen geprüften Breiten).
- **Figure Projects** schwebt eine Zeile höher (absolut positioniert) und belegt keine eigene Zeile.
  - Die rechte Kante endet genau am Ende des Project-Name-Felds (gemessen: gleiches x).
  - Die Höhe ist im Rack auf 34 px gestrafft (Symbol 21 px, enger Zeilenabstand).
  - Figure Projects und „Send to Multitrack“ haben dieselbe linke Kante, also denselben Abstand zu IMPORT AUDIO.
- **Das Rack wächst nicht mehr:**

  | Fensterbreite | Rackhöhe |
  |---|---|
  | 1850 px (wie im Screenshot) und 2560 px | 123 px statt 129 px (wird **niedriger**) |
  | 1366–1700 px | 166 px, wie vorher |
  | 1200–1280 px | 264 px, wie vorher |

  Geprüft wurde jeweils, dass Figure Projects weder Namensfeld, Save noch IMPORT AUDIO überdeckt.
- **Save-Rückmeldung:** Damit die Lücke frei wird, belegt „Gesichert · …“ keine eigene Zeile mehr. Sie erscheint als kleines Schild unter dem Namensfeld und blendet nach 5 s aus. Fehler bleiben stehen. Das gilt nur im Rack, nicht in der großen Projektansicht.
- **Schmale Layouts (≤ 1000 px)** stapeln den Save-Block direkt über der Ecke. Dort fließt Figure Projects normal über dem Knopf, und das Rack wird dafür um etwa 40 px höher (1000 px: 219 px, ohne Überdeckung).

## Raum IV: eine Leiste pro Achse

- **Keine nativen Scrollbalken mehr** (gemessen: 0 px). Mausrad und Trackpad scrollen weiterhin und bewegen die Leisten mit. Das Lineal bleibt oben stehen, die Spurköpfe links.
- **Vertikal (rechts, auf den Spurbereich ausgerichtet):**
  - Fenster ziehen = scrollen.
  - Kanten ziehen = wie viele Spuren im Blick sind, von **allen** bis **einer**: 26 Spuren → 23,4 px je Spur bzw. eine Spur = 609 px, also die ganze Ansicht.
  - Zieht man eine Kante über das Ende hinaus, kommt die andere mit. Ganz aufgezogen bedeutet also immer: alles sichtbar.
  - Spurköpfe in drei Stufen: voll (ab 58 px), kompakt (Name, M, S, ⋯; ab 34 px), mini (nur der Name). Rechtsklick auf den Kopf geht in jeder Stufe.
- **Horizontal (unten, unter der Zeitachse):**
  - Ersetzt den Zoom-Regler. Die Leiste zeigt Taktstriche, den Loop-Bereich und Mini-Clips in Spurfarbe.
  - Fenster ziehen = scrollen; Kanten = zoomen; Klick = springen; Doppelklick = ganzes Arrangement (Spurbreite = Ansichtsbreite, gemessen 1232 = 1232 px).
  - Taktnummern werden beim Herauszoomen ausgedünnt, damit sie sich nicht überlappen.
- **Tastatur** (beide Leisten fokussierbar, `role=scrollbar`): Pfeile scrollen (horizontal je ein Takt), Shift+Pfeile oder +/− zoomen, Pos1/Ende, Enter = alles zeigen.
- **Strg/Cmd + Mausrad** über den Spuren zoomt horizontal um den Mauszeiger.
- Die Mathematik liegt weiterhin im gemeinsamen Helfer `__xenViewportRail` (jetzt mit x-Achse und Mitnahme der Gegenkante).

## Prüfungen

- **`multitrack_send_probe.js`:**
  - **Vertikal:** Ziehen scrollt; Unterkante ganz nach unten zeigt alle 26 Spuren (Scrollrest 0); Unterkante ganz nach oben zeigt eine Spur, die die Ansicht füllt; Doppelklick zeigt alle.
  - **Horizontal:** Doppelklick zeigt das ganze Arrangement; Kante zoomt; Ziehen scrollt; Shift+Pfeil zoomt heraus.
  - **Allgemein:** kein Zoom-Regler mehr, keine nativen Scrollbalken, 186 Elemente mit Tooltip, keine Seitenfehler.
  - Die Send-Wege und der Import sind unverändert ok.
- **`multitrack_probe.js` (ROOM4-02):** alle Schritte unverändert (Ziehen, Trimmen, Teilen, Menüs, Wiedergabe und Live-Mute, Loop, Originaltempo, Mixdown, Neuladen, Raum verlassen).
- **Forge-Rack** bei 720, 1000, 1050, 1100, 1150, 1200, 1280, 1366, 1440, 1536, 1600, 1700, 1850 und 2560 px:
  - keine Überdeckung;
  - „Send to Multitrack“ fluchtet mit der letzten Send-Reihe (unter 760 px einspaltig, wie bisher).
- **`livezone_probe.js`:** 13 Schritte wie bei ROOM4-03, keine Fehler. 7c ist wie beim Parent „ungleich“ (animiertes Bild).

## Rückweg

ROOM4-03 (`294a6752…b3c`). Ein mit ROOM4-03b gespeichertes Projekt kann Spurhöhe oder Zoom außerhalb des alten Bereichs enthalten; ROOM4-03 begrenzt das beim Laden wieder auf 36–220 px bzw. 4–240 px. Es geht nichts verloren.
