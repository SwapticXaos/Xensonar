# ML-DRAG-CLICK-01 · Melodic Loop: Notenblöcke verschieben ohne Knistern + ML-CARDS-01 Instrumentenkästchen

Parent: `0e5bc43` (`index.html` 8 332 991 B). Jetzt 8 338 526 B (**+5 535 B**, davon ca. 5,1 KB CSS). Zone: WARM (Oberfläche, Vorhör-Auslösung im Melodic-Loop-Raum), Audiograph unverändert.
Status: CODE_PRESENT, BROWSER_CHECKED (Chromium headless). **Nicht gehört.** Nicht USER_ACCEPTED.

## 1. Verschieben von Notenblöcken: Knistern / Knacken
Zuständig ist der Vorhör-Ton beim Ziehen eines Blocks (`previewComposerGesture`, `src/rooms/canonical.js`; Wiedergabe über `hh` → `nodalPlayMelodic` / `hS`).

Befunde:
- **Dauer-Neuauslösung:** Jede Mausbewegung eines `note-move` löste den Vorhör-Ton neu aus. Die einzige Bremse war „gleiche Signatur UND < 80 ms“. Wer in derselben Tonzeile weiterzieht, bekam also etwa alle 80 ms (12×/s) Stopp + Neustart desselben Tons (gemessen: 30 Auslösungen in 2,5 s bei Zug in einer Zeile). Das ist das Stottern/Knistern.
- **Ausblendung startet hinter der Audio-Position:** `f9e` (Stopp des Vorhörens) blendet den Master in 12 ms aus, die Rampe begann aber bei `ctx.currentTime`. Das liegt hinter der Render-Position des Audio-Threads (am Gerät um Puffer-/Ausgabelatenz); die Rampe ist beim Rendern schon ein Stück gelaufen = Pegelsprung. Dasselbe Muster ist im Repo für Root Follow dokumentiert (`__f49HoldParam`, RFL-SOFT, `docs/RFL_MESSUNG_2026-11-13.md`).
- **Frühes `noteOff`:** `hS` schickte den Nodal-Stimmen sofort `stop` (Release), noch bevor die Master-Ausblendung lief.

Änderungen:
- Beim Ziehen wird der Ton **nur bei Wechsel der Tonzeile bzw. des Blocks** neu gespielt (`onlyOnChange`), höchstens alle 50 ms. Man hört weiterhin bei jedem Rasterwechsel, wo man ist (Nutzerwunsch). Klick/Maustaste ohne Ziehen: unverändert.
- `__f49FadeAndRelease(bus,sec,release,lead=0)`: neuer optionaler Vorlauf; die Rampe startet in der Zukunft. Standard 0 = alle anderen Aufrufer unverändert. `f9e` nutzt `lead = clamp(2·baseLatency+6 ms, 12, 40 ms)` (gemessen im Test: 26 ms).
- Nodal-Transport bekommt `halt()` (Planung sofort anhalten, Stimmen klingen bis zum Ende der Ausblendung); `hS` nutzt es, das eigentliche `stop` (Release) kommt wie schon bisher aus der Release-Liste von `f9e` **nach** der Ausblendung.

Messung/Ehrlichkeit: Mit einem exakten Audio-Worklet-Abgriff (Frame-genau, 4 Instrumentenspuren, Zug über Zeilen) finde ich headless **vor und nach** der Änderung keine diskreten Sprünge. Der Abgriff über ScriptProcessor, den ich zuerst benutzte, erzeugte selbst Aussetzer und scheinbare Knackser; diese Zahlen gelten nicht. Headless gibt es kaum Latenz zwischen `currentTime` und Render-Position, deshalb lässt sich der Rampen-Sprung hier nicht auslösen. Belegt ist: (a) die Neuauslösung ist weg (30 → 0 Auslösungen entlang einer Zeile), (b) die Ausblendung startet mit Vorlauf. Ob das Knistern am Gerät damit weg ist, ist **nicht gehört**.

Test: `tests/e2e/melodic_drag_preview.cjs` (auf Parent rot: Vorlauf 0; entlang einer Zeile ca. 30 Auslösungen): über Zeilen ≥ 4 Töne mit ≥ 45 ms Abstand, entlang einer Zeile ≤ 1, jede Ausblendung mit Vorlauf ≥ 12 ms. Grün außerdem: `melodic_erase`, `melodic_noteclip`, `melodic_noteclip_playing`, `long_bars`.

## 2. Instrumentenkästchen (4 bis 8 Stück) plastischer
Nur Oberfläche; Aufteilung, Größen, Texte und Bedienung unverändert, Farben bleiben (Instrumentfarbe kommt als `--ml-c` aus `je.color`).
- Karte: Körper mit Farbverlauf, Lichtkante oben, weicher Glanz auf der oberen Hälfte, Innenschatten unten, echter Schlagschatten und farbiges Unterlicht. Die gewählte Karte leuchtet von innen mit Ring und Glühen.
- Namenstaste, Sound-Pfeil, An/Mute, Reset, Only You, Pattern A/B/C als erhabene Tasten (Druck = 1 px nach unten, Hover heller); aktive Tasten (An, Only You, gewähltes Pattern) leuchten in der Instrumentfarbe; Vol/Pan in eingesenkter Wanne, Regler in Instrumentfarbe. `prefers-reduced-motion` schaltet Übergänge ab.
- Dateien: `styles/areas/035_xen-live-controls.css` (Ende), eine Variable in `src/rooms/canonical.js`. Screenshot-Vergleich nur von mir gesehen.

Rollback: `0e5bc43`.
