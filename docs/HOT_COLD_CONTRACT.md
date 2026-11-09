# Heiß/Kalt-Vertrag: XenSonar ist ein Instrument

XenSonar sieht an vielen Stellen aus wie Verwaltungssoftware (Buttons, Listen, Sessions, Pakete), muss sich im Spiel aber verhalten wie ein Computerspiel: unmittelbar, schlank, vorgeplant. Die häufigste Fehlerquelle ist die **Heiß-Kalt-Verwechslung**: Verwaltungslogik (Speichern, Validieren, Messen, React-Neuaufbau) läuft im Live-Pfad mit, oder Kaltbereiche (Spectral Forge, Archiv, Diagnose) leben im Hintergrund weiter, während der Hauptraum spielt.

Jede Änderung wird deshalb **zuerst einer Zone zugeordnet**, und der Patchbericht nennt sie.

## Die vier Zonen

| Zone | Was dazugehört | Regel |
|---|---|---|
| **HEISS · Audio-Thread** | AudioWorklet-`process()`, Knotengraph, AudioParam-Automation | Keine Allokation und keine Nachrichten pro Block. Parameter nur geglättet ändern (`setTargetAtTime`/Rampen); große Sprünge kurz ducken statt sweepen. Knoten erst bei Bedarf anlegen und stumm einhängen; Ketten ohne Wirkung (Mix 0) abbauen. |
| **HEISS · Steuerung** (Main Thread, zeitkritisch) | Drum-/Bass-/Myzel-Scheduler (25-ms-Tick, ≥ 0,32 s Vorausplanung), Note-/Hit-Trigger, Regler → AudioParam | Pro Tick nur Arbeit proportional zu den Ereignissen im Fenster. Kein React-Render, kein Storage, kein JSON, keine Validierung, keine Diagnose außer einem Zähler. Abgeleitete Werte vorher berechnen und nur bei Änderung des Owners invalidieren. |
| **WARM · Oberfläche des Hauptraums** | React-Renders, Labels, Canvas-Visuals | Regler schreiben zuerst ins Audio (direkt, höchstens 1× pro Frame), App-State und Persistenz erst, wenn die Hand ruht. Visuals dürfen Frames verlieren, Audio nie. |
| **KALT** | Spectral Forge, Package Station, Sessions/Archiv, Wave-Editor-Offline, Export, Diagnose, Inventar | Schläft, solange der Hauptraum spielt: keine Timer, Listener, rAF-Schleifen oder Audioknoten, die weiterlaufen. Große Puffer/Caches freigeben oder erst bei Bedarf laden. Arbeit in Idle-Zeit oder Worker. |

## Arbeitsregeln

1. **Zone zuerst.** Jeder Patch nennt die berührte Zone. Bei HEISS zusätzlich: Was läuft pro Ereignis, pro Tick, pro Audioblock?
2. **Messen, dann entfernen.** Messungen gehören in Test-/Probe-Builds, nicht in die Auslieferung. Produktionscode trägt höchstens abschaltbare, standardmäßig inaktive Diagnose. Ist ein Bereich nachweislich durchoptimiert, wird seine Messlogik entfernt.
3. **Ein Owner pro Wert.** Nichts doppelt oder dreifach berechnen. Abgeleitete Werte cachen, Invalidierung am Owner.
4. **Optimierung nie gegen den musikalischen Möglichkeitsraum.** Kein heimliches Kappen von Polyphonie, Länge, Auflösung oder Stimmung, kein stilles Quantisieren. Technische Grenzen sichtbar machen (z. B. Echo 3,9 s).
5. **Bewährtes nur mit Grund anfassen.** Alte Pfade ändern nur bei reproduziertem Problem oder ausdrücklichem Wunsch. Neue Funktionen werden von Anfang an richtig eingehängt.
6. **Neues ist kalt, bis es gespielt wird.** Neue Funktionen laden und rechnen erst beim ersten Gebrauch. Jeder Patch nennt seinen HTML-Größenzuwachs; größere Teile kommen in den bestehenden Lazy-Mechanismus (`application/x-xensonar-room` / `-function`).
7. **Standards sichtbar, nie verpflichtend.** 4/4, 12-EDO, gerade Notenwerte als schneller Zugang; Verhältnisse, freie Werte und Feinjustage immer manuell erreichbar.
8. **Bedienung wie ein Instrument.** Kurze Wege, Tastenkürzel, Undo, keine Einbahn-Klickstraßen, keine Bevormundung.
9. **Ehrlich über Grenzen.** Audio-Thread-Last, Hardware und Klang kann Claude im Headless-Browser nicht abschließend beurteilen. Das wird so benannt; der Nutzer hört ab.

## Bekannte Fakten (Stand 09.11.2026, gemessen in Headless-Chromium)

- **Drum-Scheduler:** ca. 0,2 % CPU im Live Room; 16 Planungsticks pro Takt, Schläge sample-genau über Bar-Ratio. Kein Optimierungsbedarf.
- **Größter Hauptthread-Verbraucher im Live Room:** Canvas-Visuals (Hauptthread ca. 35 % beschäftigt, überwiegend Zeichnen). Kandidat für verlustfreie Optimierung (z. B. Gradienten/Text cachen), nur mit Vorher/Nachher-Vergleich.
- **Diagnose in der Auslieferung:** Render-Monitor, Startup-Observer, Power-Diagnostics, Forensics, LoopRec-Forensics sowie ein WebSocket auf `ws://127.0.0.1:47812`, der bei jedem Besucher 5 Konsolenfehler erzeugt. Kandidaten für Abschaltung per Flag.
- **Code-Signale für eine Lifecycle-Prüfung:** 9 `MutationObserver`, ~330 `setTimeout`, 31 `setInterval`, 512 leere `catch {}`. Zu klären ist, was davon läuft, während der Hauptraum spielt.
- **Kein Original-Quellbaum:** Gearbeitet wird am gebauten Bundle (`runtime/index.html`). Lazy Loading geht nur über die vorhandenen Payload-Mechanismen.

## Offene Entscheidungen

- **Basisversion:** Das Handoff führt `DUB-ECHO-03+RACK-LIVE-01+NPARAMS-GATE-01` (LIVEGUARD02). `NPARAMS-GATE-01` ändert 93 alte Regler, die laut Nutzer keine Probleme hatten; messbar günstiger, aber ohne Not. Alternative: `RACK-LIVE-01` ohne Gate.
- **Zwei Echo-Linien:** DUB02 (GPT: Viertel-Bezug, `beatsPerBar`, Modi Steps / N/D / N-in-M / Free, Time Warp, 19,5 s) und DUB03 (Claude: Takt-Bruch, Beat-Marker, Feel, L:R, Cross-Feed, 3,9 s). Konsolidieren statt parallel weiterführen; prüfen, ob es ein echtes globales Taktmaß gibt, das DUB03 berücksichtigen muss.
