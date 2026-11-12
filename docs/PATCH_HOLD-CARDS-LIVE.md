# HOLD-CARDS-LIVE: Rechtsklick-Pitch-Regler wieder da, Karten editieren Plan-Stufen, Plan AN/AUS im Hauptraum, „Save changes“ auch live

Parent: `9f53d88`. Status: CODE_PRESENT, BROWSER_CHECKED (Chromium headless), **nicht gehört**, nicht USER_ACCEPTED.

## Befund: der Rechtsklick-Regler war nicht „weg“, er hat den Live-Raum zum Absturz gebracht
Rechtsklick auf eine Slot-Karte (Thunder Mode, Hauptraum) löste `ReferenceError: preview is not defined` aus: „Room error isolated – Live Room could not finish loading“. Ursache: THUNDER-HPP01c (frühere Konsolidierung der Karten) hat die Hilfsfunktion `preview` entfernt und durch `__xenHoldPitchSlotFace` ersetzt, aber **einen Aufruf im Regler-Popup stehen lassen**. Das lag seit damals unentdeckt im Code, weil kein Test einen Rechtsklick auf die Karte ausführte. Das Fehlerbild war „Regler verschwindet“. Es gab nie eine Entscheidung, ihn zu entfernen.
- Fix: das Popup nutzt wieder `__xenHoldPitchSlotFace` (gleiches Gesicht wie die Karte, roter Strich).
- Zusätzlicher Fehler von mir (HPP-LIVEVIEW-02): Bei gezeigter Plan-Stufe waren die Karten schreibgeschützt. Das ist zurückgebaut: **Klick = Pause/Ton, Rechtsklick = Pitch-Regler ±1 Oktave** gelten für das Lane-Pattern **und** für die gezeigte Plan-Stufe; Änderungen an einer Plan-Stufe werden in diese Stufe des Plans geschrieben und der Stufenname bekommt „(edited)“ (kein veralteter Beschreibungsname). Der Regler läuft als Portal; seine Ereignisse liefen durch meinen „zurück zur Lane“-Handler und schlossen ihn sofort: ebenfalls behoben.
- Test `tests/e2e/hold_cards_live_edit.cjs` (neu): Rechtsklick öffnet den Regler, Klick im Regler setzt die Tonhöhe genau dieses Slots, Linksklick toggelt; dasselbe bei einer Plan-Stufe. Auf dem Parent rot (Absturz).

## Plan AN/AUS im Hauptraum
In der Zeile über den Karten steht bei vorhandenem Plan der Schalter **„Plan ON / Plan OFF“** (feste Breite). OFF: das Lane-Arpeggio spielt auf jeder Taste; der Schalter bleibt sichtbar, auch wenn der Plan aus ist. Bei ON und Lane-Ansicht erklärt ein Hinweis, warum ein geladenes Lane-Arpeggio nicht überall klingt („… Switch the plan OFF to use it on every key.“). Der Studio-Knopf zeigt „Plan: <Name>“ bzw. „Plan off: <Name>“.

## „Save changes to …?“ auch außerhalb des Studios
- **Plan:** wurde der aktive Plan (auch live über die Karten) gegenüber seiner geladenen Form geändert, fragt das Studio beim Wechsel (Load / Fill / Remove) — wie zuvor.
- **Lane-Arpeggio (neu):** wurden die Karten gegenüber dem zuletzt geladenen/gespeicherten Pattern geändert, fragt **„Load“** im Bereich „Arpeggio Patterns“ vor dem Wechsel: *Save as “<Name> (edited)”* / *Discard changes* / *Cancel*. Der Rechenvergleich merkt sich das zuletzt geladene Pattern auch, wenn man in der Liste schon ein anderes anwählt.

## Offen
- Sessions, die einen Plan ohne bekannte Ausgangsform wiederherstellen, fragen beim Wechsel nicht (kein Vergleichswert).
- Hören: nichts davon ist gehört.
