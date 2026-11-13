# Gesamt-Audit 13.11.2026: Prüfskripte (nur Test, nicht Teil der App)

Bericht: `docs/AUDIT_2026-11-13.md`. Alle Skripte lesen nur; nichts davon gehört in `index.html`.

Statisch (benötigt `npm i acorn acorn-walk` in einem beliebigen Arbeitsordner, von dort aufrufen):

    node extract.cjs  /pfad/index.html  ./blocks   # zerlegt in Script-/Style-Blöcke + index.json
    node parse.cjs    ./blocks                     # Syntax je Block, Kennzahlen, globale Namenskollisionen
    node worklets.cjs ./blocks                     # eingebettete Worklet-Quellen, Allokationen/Nachrichten in process()
    node ls.cjs       ./blocks                     # localStorage-Schreibstellen außerhalb eines try-Blocks (nur lexikalisch)

Browser (Playwright + Chromium, absoluter Pfad zur ausgelieferten `index.html`):

    node cold_start.cjs         "$PWD/index.html"  # Kaltstart: Fehler, Netz, Storage, lange Tasks
    node rooms_a11y.cjs         "$PWD/index.html"  # alle fünf Räume, Bedienelemente ohne Namen, 390-px-Breite
    node room_return_power.cjs  "$PWD/index.html"  # Power-Zustand und Knotenerzeugung nach Raumwechsel
    node room_cycle_memory.cjs  "$PWD/index.html"  # Heap/DOM/Listener über 8 Raumwechsel-Zyklen
    node play_load.cjs          "$PWD/index.html"  # ca. 45 s Spielbetrieb: Hauptthread, Knoten/s, Heap, Storage
