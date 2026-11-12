# ROOM5-09: Dreieck-Edge-Case, ein Thunder-Schalter pro Tab, Linksklick während Hold

Status: CODE_PRESENT, BROWSER_CHECKED (Playwright, headless, RED auf Parent und GRÜN mit Patch für 1 und 3). Nicht USER_ACCEPTED, nicht am Gerät gehört.
Zone: WARM (Zeiger-Handler, Oberfläche). Der Audio-Pfad und die Hold-Planer-Mathematik sind unverändert. Daten-Owner: `nexusParams` (Shell).

## 1. Edge Case: markiertes Dreieck, aber das darunter wird gemutet
Ursache: Der Hover (ROOM5-06) und der Rechtsklick wählen die **nächstliegende** Linie (`__XenGridHandles.hit`), der Mausdruck im Live-Raum
nahm aber noch `getVisibleGridLines().find(...)` = die **erste** Linie innerhalb 12 px, auch wenn sie gar kein Stimm-Dreieck (`stepIndex`) hat.
Bei dichten Rastern (31-EDO, Quinten-Skalen) lagen mehrere Linien in 12 px: das markierte Dreieck und das getroffene unterschieden sich.
Fix: der Mausdruck nutzt dieselbe Regel `__XenGridHandles.hit` (eine Quelle für Hover, Klick, Ziehen, Rechtsklick).
Test: `tests/e2e/live_grid_handles.cjs` (31-EDO, zwei Griffe 6–11 px auseinander; auf dem Parent wurde ein anderer Schritt gemutet).

## 2. Ein Thunder-Schalter, gebunden an den offenen Tab
Der Schalter in der Hold-Zone gilt für den Tab, der gerade offen ist (Keyboard-Hold / Enter-Hold), Beschriftung „ON (E)“ / „OFF (E)“ bzw. „(K)“.
Feste Breite (58 px, passt „OFF (K)“): beim Umschalten und beim Tabwechsel verschiebt sich kein Nachbar mehr. Der Wert des anderen Tabs bleibt unverändert.
Test: `tests/e2e/thunder_lane_split_ui.cjs` (Zustand je Tab, Breite, Position des Nachbarn „Q“).

## 3. Linksklick (Wave Starter) während Keyboard-Hold / Enter-Hold
Ursache (per Messung belegt: während eine Taste gehalten wird, wurde `spawnNexusRipple` nie erreicht): Solange eine Hold-Geste aktiv ist (Thunder an),
startet der Mausdruck die Morph-Geste („Avalanche“: Ziehen in X = Klang, in Y = EQ-Morph der gehaltenen Note) und der Handler kehrte sofort zurück.
Der Klick erreichte den Wave Starter nicht; bei Enter-Hold ging er nur zeitweise.
Fix: der Mausdruck startet die Morph-Geste wie bisher **und** löst den Wave Starter aus (gleiches Verhalten wie ohne gehaltene Note).
Folge: Wer während eines Holds zum Modulieren zieht, löst am Druckpunkt auch einen Wave-Start aus. Falls das stört, wäre ein Schalter „Zug moduliert, Klick startet nicht“ möglich (nicht gebaut, bitte Rückmeldung).
Das ist die Voraussetzung dafür, Keyboard-Hold und den Psy-Lab-Wave-Starter (Gleiten, Linksklick) gleichzeitig zu spielen.
Test: `tests/e2e/live_click_during_hold.cjs` (3 Klicks = 3 Starts im Leerlauf, bei gehaltener Taste, bei gehaltenem Enter; Morph-Geste läuft weiter; Ende bei Loslassen).

## Offen
- Hörtest: Zusammenspiel Keyboard-Hold + Wave-Starter-Klick (Pegel, Pulse, Gleiten) ist nicht gehört.
- Bei 420 px Breite ist das Dokument insgesamt breiter als der Viewport (Seitenscroll); das ist nicht von der Hold-Zone verursacht, der Schalter selbst liegt innerhalb der Zone.
- Rollback: Commit davor (c05c74d).
