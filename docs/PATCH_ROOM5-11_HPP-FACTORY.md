# ROOM5-11 · THUNDER-SPEED · HPP-FACTORY · HPP-LIVEVIEW

Parent: `888d3f7` (ROOM5-10), `index.html` 9 048 736 B. Rollback: `888d3f7`.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium headless). **Nicht gehört, kein Firefox, keine Hardware.** Nicht USER_ACCEPTED.

## Kritische Rückschau auf ROOM5-10 / HOLD-LIB (Fehler des vorigen Versuchs)
1. **Psy Lab Live: Töne endeten nie.** Der Psy-Lab-Prozessor speichert Stimmen-IDs in einem Typed Array und vergleicht `+id`. ROOM5-10 schickte Text-IDs (`"keyboard:KeyA"`) → `NaN`, kein Note-Off traf je; Töne klangen, bis Stimmen geklaut wurden. Der Test prüfte nur, dass Nachrichten *gesendet* wurden, nicht, dass der Ton *endet*. Jetzt: Pegelmessung am Engine-Ausgang.
2. **Power off klang weiter:** Die Psy-Lab-Engines hingen am Master, aber kein Power-Pfad kannte sie.
3. **Factory-Arpeggios zu langsam:** 4–8 Noten pro Takt (Viertel/Achtel). Thunder Mode ist zum Shredden da.
4. **„Pläne“ waren keine Pläne:** Die Theorie-Presets legten dieselbe Figur (in Grid-Schritten) auf jede Stufe; ein Plan muss jeder Stufe ihr *eigenes* Arpeggio geben.

## ROOM5-11: Psy Lab Live richtig beenden (HEISS-Steuerung, KALT-Chunk)
- `LiveHost` vergibt pro Live-Ton eine **Zahl** als Stimmen-ID; der Textschlüssel (Spur + Taste) bleibt im Host. Erneutes Anschlagen derselben Taste gibt die alte Stimme frei.
- `panic()`: Power off (Effekt auf `nexusActive` in der Shell) und Verlassen der Shell entsorgen alle Psy-Lab-Engines (All-Off, Ausgang in ~40 ms auf 0, dann getrennt). Beim nächsten Ton bzw. bei wiederhergestelltem Klang (sobald Audio läuft) wird die Engine neu angelegt.
- Tests: `tests/room5_live_host.cjs` (IDs sind Zahlen, Off trägt die Zahl des On, Re-Press, Panic); `tests/e2e/room5_live_psylab.cjs` **Pegel**: gehaltene Taste hörbar, nach Loslassen < 8 % (Release + Delay-Fahne), Power off bei weiter gehaltenen Tasten < 0,002 am Engine-Ausgang **und am Master**, nach Power on spielt die Tastatur wieder. Auf dem Parent rot (Text-ID im Draht).

## THUNDER-SPEED: Factory-Arpeggios für Shredding (KALT)
45 Figuren, alle mit ≥ 20 Noten pro Takt: 32tel (Standard), Sextolen-16tel (Dreiklang-Rollen, ↑↓-Figuren mit 6 Tönen), Quintolen (add9). Bei 108 BPM 69 / 93 / 111 ms pro Ton.
Neu u. a.: Kirchentonarten-Läufe (Dorian, Phrygian, Lydian, Mixolydian, Locrian, Ionian ↑↓, Aeolian ↑↓), harmonisch Moll, Pedal-Point-Shred, Bebop-Dominant-Lauf, Enclosure, halbvermindert, minor-major 7, Tremoli, reine Stimmungen als ↑↓-Sweeps.
„Bars“ bleibt nach dem Laden editierbar (langsamer = mehr Bars). Test: `tests/hold_factory_patterns.cjs` (Tempo ≥ 20/Takt, meist 32tel).

## HPP-FACTORY: echte Pläne (KALT, Plan-Insel)
- 9 Factory-Pläne in der Plan-Bibliothek („Choose a plan…“ → Gruppe *Factory plans · every degree its own arpeggio*), je Stufe ein **benanntes** Factory-Arpeggio und ein Stufen-Label:
  Diatonic sweeps (Dur), Jazz · sevenths & bebop (Dur), Baroque · running lines (jede Stufe ihr Modus), Baroque · figured accompaniment, Pop · pentatonic & sus,
  Diatonic sweeps (Moll), Neo-classical shred (Moll, harmonische Dominante), Jazz · minor ii–V–i, Just intonation · pure triads.
- Gebaut für 12-EDO Ionian/Aeolian auf dem **aktuellen Grundton**. Steht der Raum auf einem anderen Grid, zeigt die Plan-Ansicht die Abweichung mit „Restore plan Grid“ (wechselt nie automatisch).
- Die gleichförmigen Theorie-Presets aus HOLD-LIB-03 sind entfernt. Die ursprünglichen neutralen Figuren (HPP01b) bleiben als „Fill every step with one figure“ (vorher „Generate/New from preset“), damit klar ist, dass das keine Pläne sind.
- Nach dem Laden ist es ein gewöhnlicher Plan: Stufen umbelegen, speichern („Save As“), Labels ändern.
- Test: `tests/e2e/hold_plan_factory.cjs` (jede Stufe ein Factory-Arpeggio, ≥ 3 verschiedene Figuren pro Plan, Dur-Akkordqualitäten I/ii/IV/V7/vi/vii°, jede Stufe ihr Modus, Laden in der echten Plan-Ansicht inkl. „Restore plan Grid“, Resolver liefert pro Stufe eine andere Figur).

## HPP-LIVEVIEW: sehen, was gerade spielt (WARM) · Nachtrag HPP-LIVEVIEW-02
Erste Fassung (Kasten „Plan playing“ mit eigenem Balkendiagramm) war eine **Doppelstruktur** zu den vorhandenen Slot-Karten (rote Tonhöhenlinie, `iT` / `__xenHoldPitchSlotFace`) und ist zurückgebaut.
Jetzt zeigen die **vorhandenen Slot-Karten** und die **vorhandene Infozeile** („6/6 active · 0.25 T.“) bei aktivem Plan die Figur der Stufe, die der letzte Anschlag spielt (nur lesend, `iT` bekam dafür `readOnly`).
Darüber steht nur eine Zeile mit den Stufen-Nummern/-Labels (gespielte leuchtet) und „Lane“: Klick auf eine Nummer zeigt diese Stufe, „Lane“ (oder jede Berührung der Lane-Einstellungen Slots/Bars/Rhythmus) zurück zum editierbaren Lane-Pattern, das auf leeren und Off-Grid-Stufen spielt.
Während eine Plan-Stufe gezeigt wird, sind die Lane-Einstellungen abgeblendet, damit „Slots 16“ neben einer 6-Slot-Figur nicht widersprüchlich wirkt.
HEISS-Anteil: der Plan-Resolver merkt sich die Position (Off-Grid = −1). Das Panel liest sie alle 90 ms, nur bei offenem Tab und aktivem Plan.
Test (`tests/e2e/hold_plan_factory.cjs`): echte Tasten 1–4 → leuchtende Nummer = Stufe, Infozeile nennt das Arpeggio, **Kartenzahl = Slots der Figur, rote Linie jeder Karte = Tonhöhe des Slots**; kein zweiter Grafik-Kasten im DOM; Karten nur lesend; „Lane“ zeigt das editierbare Lane-Pattern; Berührung der Lane-Einstellungen schaltet zurück; ohne aktiven Plan keine Nummernzeile.

## Offen
- Hörtest: Tempo-Gefühl (32tel bei hohem BPM), Pegel der Slots, Psy-Lab-Releases der Werksklänge (Delay-Fahnen bis mehrere Sekunden sind Klangdesign).
- Factory-Pläne setzen 7 Stufen voraus (12-EDO diatonisch); für andere Grids gibt es weiter die neutralen Figuren und das Selbstbauen.
- Der Live-Kasten zeigt den letzten Anschlag, nicht jede einzelne gehaltene Taste bei Mehrfachgriffen.
