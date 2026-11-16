# LANE-FOLLOW-01 · Quick Rack und Lane-Alignment-Feld folgen der Länge der laufenden Session

Parent: `4adc999` (LONG-BARS-01). Rollback: `4adc999`.
Zone: WARM (Oberfläche, Layout-Messung). Kein Audio.
Status: CODE_PRESENT, BROWSER_CHECKED (neuer Test, RED auf Parent). Nicht auf Gerät.

## Befund
Die Höhe des Quick Rack richtete sich nach der **längsten Liste aller gespeicherten Sessions** plus einem gespeicherten Höchstwert (`archiveRows`). Wurde die laufende Session gekürzt, blieb das Rack hoch, das Feld Volume/Pan/Pitch/Nudge/EQ (Lane Alignment) darunter blieb unten (Parent: Rack unten bei 1019 px, Feld bei 928 px, also außerhalb) und war gestaucht und scrollbar. Zusätzlich maß das Feld seine Höhe nur bei Größenänderung des Felds selbst, nicht wenn das Rack darüber schrumpfte.

## Änderung
- `__xenQuickGlobalRows(null, s.items)`: Rack-Höhe nur nach der **laufenden** Session (mindestens 5 Zeilen wie bisher).
- Das Lane-Feld beobachtet zusätzlich das Rack (`ResizeObserver`), Höhe und Zeilenabstand werden in beide Richtungen neu gemessen.

## Messung
Rack mit 29 Einträgen: Rack-Unterkante 1001 px, Feld auf 64 px gestaucht. Nach dem Kürzen (lange Session bleibt gespeichert): 551 px, Feld 406 px hoch, Zeilenabstand 24 px, Position wie vor dem Verlängern. Parent: bleibt bei 1019 px.

## Test
`tests/e2e/lane_follow.cjs`.

## Offene Risiken
- Die frühere einheitliche Höhe über alle Sessions ist weg: beim Wechsel zwischen Sessions mit unterschiedlich langen Listen ändert sich die Rackhöhe (und die Marker-Position des Recorders darunter). Das war so gewünscht; falls es unruhig wirkt, ließe sich eine Glättung ergänzen.
- `archiveRows` wird weiter gespeichert, aber nicht mehr für die Höhe genutzt.
