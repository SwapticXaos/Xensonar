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

---

# NODAL-FACTORY-01 + ML-CARDS-01b (gleiche Sitzung, Folgeauftrag)

Parent: `58ff565` (`index.html` 8 338 526 B). Jetzt 8 344 248 B (**+5 722 B**). Zone: WARM/KALT (Menü und Verwaltung des Melodic Loop, kein Audiopfad geändert). Status: CODE_PRESENT, BROWSER_CHECKED. **Nicht gehört.**

## „No saved Entrophon / Nodal“ im Melodic Loop
Befund: Die Verwaltungen (Nodal · Manage, Entrophon · Manage) zeigen nur selbst gespeicherte Sounds (localStorage-Bibliotheken) und sagten bei 0 Einträgen „No saved …“, obwohl die mitgelieferten Sounds existieren. Im Klangmenü der Instrumentenkästchen waren die 10 Entrophon-Factory-Sounds schon da, bei Nodal aber nur „troodle“; die sechs Nodal-Starter (Prism, Ember, Hollow, Filament, Reed, Obsidian) gab es nur im Nodal-Raum.
- **Nodal-Factory-Sounds:** `nodal:factory:<id>` (ohne Revision, wie das bestehende `nodal:factory:troodle`): `__xenNodalFactoryInstrument/List` in `src/nodal/07_sound_designer.js` (`nodalOpenStarter` dorthin verschoben, global), Auflösung in `nodalFindInstrument` und im Surface-Resolver, Menü in `nodalInstrumentMenu`. Nicht im Song-Bank gespeichert (bestehende Regel für `…:factory:`), im Referenzgraphen nicht als „extern möglich“ gezählt.
- **Verwaltungen:** Abschnitt „Built-in sounds“ (nur lesen): Preview und **Save copy** (legt einen editierbaren Eintrag in der Bibliothek an; `Manage (n)` zählt mit). Leertext jetzt „No saved copies yet.“
- Keine Migration, keine Änderung an gespeicherten Bibliotheken oder Projekten.
- Nicht gebaut: „vielleicht noch ein paar neue Nodal Sounds“. Die sieben vorhandenen sind jetzt erreichbar; neue Klänge brauchen Gehör, daher nicht auf Verdacht.
- Test `tests/e2e/melodic_factory_sounds.cjs`: alle 7 Schlüssel lösen auf, Menü bietet sie, Auswahl spielt ohne Fehler, beide Verwaltungen listen Built-ins, Save copy +1 Eintrag je Bibliothek. Grün außerdem: `melodic_drag_preview`, `looprec_live_lanes`, `keyboard_lane_eq`, `nodal_gate`; `run_tests.sh` 139/139, `build.py --check` OK.

## Kästchen-Nachbarn plastischer (ML-CARDS-01b)
Die zwei Menü-Buttons (Nodal teal, Entrophon violett) und die zwei quadratischen Buttons links (zur Drum Machine) und rechts (Instrument hinzufügen, Violine) im selben Tasten-Stil wie die Kästchen: Verlauf, Lichtkante, Glanz, Schatten, Druck 1 px. Nur CSS (`035_xen-live-controls.css`). Der Drum-Machine-Pfeil gilt global, auch im Drum-Raum (gleiche Klasse).

## Offen aus diesem Auftrag
- **Donor-Fehler (Spectral Forge, „Quelle nicht angenommen“):** nicht reproduziert. Getestet: Carrier zeichnen, Send to Editor, schneiden, neu markieren, Editor schließen, Import-Dock zuklappen, dreimal Effekt + Apply/Bake: der Donor wurde jedes Mal angenommen. Die Meldung stammt aus `src/rooms/lab.js` (`resolve-last-donor`: fehlende Quelle oder Maske) bzw. `src/forge/ui/03_method_selection.js`. Braucht den genauen Klickweg und Meldungstext.
- **Playhead blau/lila** (Navigator vs. Loop Mask): noch nicht untersucht (gleiche Frage nach dem Ablauf).

Rollback: `58ff565`.

---

# BUILTIN-SEED-01 (Korrektur zu NODAL-FACTORY-01, 21.11.)

Parent: `86cfa35` (`index.html` 8 357 464 B laut Build davor). Jetzt 8 356 417 B (**−1 047 B** gegenüber dem Stand mit den Sonderzeilen). Zone: KALT (einmalig beim Öffnen des Melodic Loop). Status: CODE_PRESENT, BROWSER_CHECKED. **Nicht gehört.**

## Rückmeldung und Fehler
NODAL-FACTORY-01 hatte für die mitgelieferten Sounds eine **Sonderregel**: Sonderzeilen in den Verwaltungen (nur Preview und „Save copy“, später „Edit“ = Kopie), Nodal-Starter nur als eigene „Factory“-Einträge im Menü. Das war eine Klickstraße und ungleich zu den gespeicherten Sounds. Im Melodic Loop standen die Entrophon-Sounds außerdem gar nicht im Menü (die Factory-Liste gibt es nur im Live Room); meine Aussage dazu im ersten Bericht war falsch. Nutzerbild: Entrophon erschien erst nach „Save copy“/„Edit“, Nodal doppelt („Ember Network 1/2, 2/2“).

## Lösung: sie sind ganz normale Bibliothekseinträge
- Beim ersten Öffnen der Import-Verwaltungen im Melodic Loop (`__xenSeedBuiltinSounds`, `src/nodal/07_sound_designer.js`) werden **einmal** die sechs Nodal-Starter (Prism, Ember, Hollow, Filament, Reed, Obsidian) und die zehn mitgelieferten Entrophon-Sounds in die jeweilige Bibliothek geschrieben. Ab dann sind sie in den Verwaltungen mit **Preview, Edit, Rename, Remove** und im Instrumentenmenü der Kästchen wie jeder gespeicherte Sound. Kein Zwischenschritt.
- Ein Flag je Bibliothek (`xensonar.nodal.builtinSeed.v1`, `xensonar.entrophon.builtinSeed.v1`) verhindert, dass ein entfernter Sound wiederkommt. Identische Sounds werden nicht verdoppelt (die Bibliothek entdoppelt); bei voller Bibliothek (48) stoppt das Seeding. Bestehende Einträge und Projekte bleiben unberührt. troodle (mit Werks-EQ) bleibt ein eingebauter Schlüssel.
- Entfernt: die Sonderzeilen in den Verwaltungen, die zusätzlichen Nodal-Factory-Einträge im Melodic-Loop-Menü und in der Live-Room-Nodal-Liste (die Bibliothekseinträge decken sie ab).
- Live Room, Entrophon-Liste: ein ungeänderter, gesäter Entrophon-Eintrag wird dort nicht zusätzlich neben dem eingebauten gelistet (die eingebaute Liste bleibt, u. a. wegen des Standard-Presets `entrophon:factory:glas-zerrbild@1`).
- Auflösung über `nodal:factory:<id>` bleibt (harmlos), jetzt abgesichert (`typeof`), weil `tests/song_instrument_definitions.test.cjs` die Surface-Datei allein lädt: der Aufruf war seit NODAL-FACTORY-01 unabgesichert und ließ diesen Test mit `ReferenceError` abbrechen. Der Test ist weiter rot, jetzt wegen eines älteren, nicht damit zusammenhängenden Fehlers (`__XenNodalHoldPCM`); er steht nicht in `tests/GREEN_NODE_TESTS.txt` und war auf dem Stand davor schon rot.

Test `tests/e2e/melodic_factory_sounds.cjs` neu geschrieben: vor dem Öffnen nichts geschrieben; danach 6 Nodal- und 10 Entrophon-Einträge; Zeilen mit Preview/Edit/Rename/Remove, alle aktiv; Menü bietet sie an, ein Nodal-Sound spielt ohne Fehler; Remove bleibt weg; Live-Room-Liste ohne Doppelung. Gezielt grün außerdem: `song_factory_nodal_capture`, `live_lane_01`, `looprec_live_lanes`. Keine Suite gestartet (Nutzerwunsch). Nicht geprüft: das Paketstations-Inventar-Verhalten mit gesäten Einträgen (sie werden wie gespeicherte Sounds exportiert).

Rollback: `86cfa35`.
