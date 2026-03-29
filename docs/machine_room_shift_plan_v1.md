# Machine Room Shift Plan v1

Diese Datei fixiert die gleitende Zuständigkeitsverschiebung, damit nach Chat-Resets nicht wieder Frühphasen-Logik unbemerkt zurückkriecht.

## Zielbild

- **V Xensonar** bleibt Aufführungs- und Routingkern.
- **III.2a Forge 1** bleibt die stabile Produktionswerkbank.
- **III.2b Forge 2** übernimmt schrittweise Segmentarbeit: Wave/Material sowie Microtonal Logic, Groove und Bass.
- **III.1 Myzel** wird nachgelagerter FX-/Mastering-Raum, global oder gruppenbezogen, vor Limiter und Finalisierung.
- **III.2c Fremdgerät-Slot** bleibt neutraler Dockingpunkt.

## Drift-Warnsignale

1. Neue Speziallogik landet wieder direkt in `App.tsx`, obwohl sie Segment- oder Post-FX-Arbeit ist.
2. Forge-Adapter, Materialschema und Producer-Notizen driften auseinander.
3. Forge 2 verliert seine Zwei-Flächen-Identität und wird wieder bloß ein einzelner Editor.
4. Myzel bekommt wieder primäre Loop-/Pattern-Aufgaben statt nachgelagerter Formung.
5. ZIP-Artefakte, Backups, `dist` und `node_modules` blähen den Arbeitskontext auf.

## Patch-Regel für künftige Arbeit

Vor neuen Features zuerst prüfen:

- Gehört das in den Aufführungsraum, in den Segment-Maschinenraum oder in den Post-/Mastering-Raum?
- Ist der Adaptervertrag betroffen?
- Muss die Producer-/Render-Info die Verschiebung mit markieren?
- Wird ein alter Legacy-Begriff recycelt, der heute etwas anderes bedeuten würde?

## Praktische Konsequenz

Der Monolith wird nicht blind zersägt. Stattdessen werden Kompetenzen nach außen gezogen, bis `App.tsx` zunehmend koordiniert statt Speziallogik zu beherbergen.
