# HWKB-02 · Hardware-Keyboard: Anschlagsdynamik, Layouts (auch Lumatone/MPE), Pedal und Regler, robuste Adapterschicht

Basis: Merge von HWKB-01 (`claude/eloquent-turing-pt64zz`, Stufe 1) in den Arbeitszweig = `d18c33a`, `index.html` 8 136 532 B. Jetzt 8 153 032 B (**+16 500 B**, im Hauptbündel: die Schicht muss ohne Ladezeit an den Tasten-Einstieg; sie tut nichts, bis sie eingeschaltet wird).
Zone: WARM (Eingabe). Pro MIDI-Nachricht reines JS, kein React, kein Speichern, kein Audioknoten; der Monitor frischt höchstens alle 120 ms auf. Pro Ton ein Nachschlagen (`gainFor`), keine Allokation.
Daten-Owner: eigener Browser-Schlüssel `xensonar.hwkeyboard.v1` (wie bisher), additiv erweitert; ein HWKB-01-Eintrag lädt unverändert und bekommt die Vorgaben. Nichts in Sitzungen, Presets oder `.xenpack`.
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED **mit simulierten Geräten**. **An keiner echten Hardware geprüft** (es gibt hier keine). Nicht gehört.

## Grundsatz (unverändert, jetzt auch im Dialog so gesagt)
Das Raster bestimmt die Tonhöhe, das Keyboard nur die Rasterlinie: Taste um Taste ist Rasterlinie um Rasterlinie, mit Stimmung und Periode (Tritave bleibt Tritave), gemutete Stufen werden übersprungen, das Keyboard-Fenster gilt. Wer Klavier spielen will, stellt ein 12-stufiges Raster ohne Mute-Pattern ein. Ein Wechsel des Mute-Patterns oder der Stimmung wirkt sofort auf die nächste gespielte Taste, weil jede Hardware-Taste denselben Weg geht wie eine Computertaste (`bPe`).

## Neu
| Was | Wie |
|---|---|
| **Anschlagsdynamik** | Die Stärke des Tastendrucks wird zum Pegel des Tons (Faktor `touchGain`), für den ersten Ton **und jeden Hold-Puls** dieser Taste, auch für Psy-Lab-Klänge (`vel`). Computertasten, Maus und Enter bleiben bei 1. |
| **Kennlinie im Dialog** | Kurve weich / linear / hart / **fest** (für Keyboards ohne Dynamik), „Softest“ (Pegel des leisesten Anschlags), „Loudest“ (bis 150 %), **Bereich dieses Keyboards** (Werte von/bis) und **„Use what I played“**: ein paar Tasten so leise und so hart wie möglich spielen, Knopf drücken, der gespielte Bereich wird übernommen (viele Keyboards erreichen 127 nie). |
| **Layouts** | *Eine Tastenreihe* (jedes übliche Keyboard; isomorphe Controller, die einfache Tastennummern senden, sind damit im Raster isomorph). *Mehrere Kanäle in Reihe* (Lumatone und andere Mehrkanal-Keyboards: ein Kanal pro Feld zu 56 Tasten oder, wie vom Hersteller für mikrotonale Stimmungen empfohlen, ein Kanal pro Periode): Position = (Kanal − erster Kanal) × Tasten pro Kanal + Taste − erste Taste. *MPE* (ein Kanal pro Finger): der Kanal zählt nicht für die Position. „Learn first key“ lernt im Kanal-Layout Taste **und** Kanal; der Dialog zeigt die gesehenen Kanäle. |
| **Pedal, Rad, Regler, Pads, Programmtasten** | Ein Bedienelement **drückt eine vorhandene XenSonar-Taste**: gehalten, solange Pedal/Rad über der Mitte steht (≥ 64), angetippt von einer Programmtaste. Zwei Schritte: „Learn a control“ (Element bewegen), dann Ziel wählen: Sustain, Swell (B), Damp (Alt), Oktave/Periode, Fenster hoch/runter, Wave Starter, Foundation lösen, oder **„Another key…“ = irgendeine Taste der Computertastatur**. Damit ist alles, was ein Tastenkürzel hat, vom Gerät aus erreichbar, ohne neue Verdrahtung. Vorgabe: Sustain-Pedal (CC64) → Sustain-Taste. Ein Pad, das zugewiesen ist, spielt keine Note. |
| **Ein Profil pro Gerät** | Erste Taste, Layout, Kennlinie und Zuweisungen werden je Gerätename gemerkt (Geräte-IDs sind zwischen Browsern nicht stabil). Ein neues Gerät startet mit den Einstellungen für „All devices“. |
| **Robuste Zerlegung** | Mehrere Nachrichten in einem Paket, Running Status (auch über Pakete hinweg), Echtzeit-Bytes mitten in einer Nachricht, System-Exclusive-Blöcke, Ein-Byte-Nachrichten (Programm, Kanaldruck). Fehler in einer Nachricht stoppen den Empfang nicht. |
| **Nichts bleibt hängen** | Tasten haben die Kennung Kanal + Nummer (dieselbe Nummer auf zwei Kanälen sind zwei Tasten). „All Notes Off“ / „All Sound Off“ (CC123/120), Abziehen, Gerät- oder Layoutwechsel, Ausschalten und **Fensterwechsel (blur)** lassen alle Töne und gehaltenen Bedienelemente los. |
| **Pitch Bend / Aftertouch** | werden gezählt und im Monitor gezeigt, aber nicht verwendet: das Raster bestimmt die Tonhöhe. (Ein Rad kann als Bedienelement über CC eine Taste halten.) |
| **Monitor / Gerätebericht** | Monitor zeigt je Taste Position und Pegel („v64 … level 0.57“) und bei Bedienelementen das Ziel. Der Bericht nennt Layout, Kennlinie, Zuweisungen und gesehene Kanäle. |

## Geänderte Stellen
- `src/post-oct/037-xen-hardware-keyboard.js`: Kern (Layouts, `levelOf`, `gainFor`, `split`, Zuweisungen, Profile) und Dialog.
- `src/rhythm/04_workspace_and_transport.js` (`bPe`): `touchGain` in den Optionen des ersten Tons.
- `src/audio/05_live_voice_runtime.js`: `touchGain` in den Hold-Pulsen (über die Tastenkennung des Pulses), in der Options-Weißliste des Direktpfads (`Lxe`), als Faktor in der Stimm-Lautstärke (`pL`, 1 wenn nicht vorhanden) und in `vel` der Psy-Lab-Tastaturnote.
- Befund dabei: Im Direktpfad der Tastatur filtert `Lxe` die Slot-Lautstärke (`holdSlotGain`) heraus. Deshalb ein eigenes Feld statt der Slot-Lautstärke; an der Slot-Lautstärke selbst wurde nichts geändert.

## Prüfung
- **Unit** `tests/hwkeyboard_core.cjs` (erweitert, weiter 124 grün): Kennlinien (Endpunkte, Mitte, monoton, fest, gespielter Bereich, Bereinigung), Pegel je Tastenkennung, Layouts (Lumatone-artig 56 je Kanal, ein Kanal pro 31er-Periode, MPE mit gleicher Taste auf zwei Kanälen, Lernen im Kanal-Layout), Bedienelemente (Pedal einmal runter/einmal hoch, Schwelle 64, All Notes Off, gelerntes Rad → Swell, Pad auf Kanal 10 → Fenster, Programmtaste tippt, Entfernen), Zerlegung (Paket, Running Status, Echtzeit-Byte, SysEx, unvollständig), Profile je Gerät über einen Neustart, blur lässt los, alter HWKB-01-Speicher lädt.
- **Browser** `tests/e2e/hwkeyboard_touch.cjs` (echte App, zwei simulierte Geräte): Der Pegelfaktor erreicht die Stimme für ersten Ton und Hold-Pulse (leisester Anschlag 15 %, Mitte linear 57,5 %, Stimm-Lautstärke folgt); Computertaste unverändert; Kurve hart/weich/fest, Softest 50 %, Loudest 60 % wirken sofort; Keyboard mit Werten 30–100: „Use what I played“ macht daraus den vollen Bereich; zwei Töne in einem Paket mit Running Status; Pitch Bend verändert nichts; **Kanal-Layout: Kanal 2 Taste 3 = Position 15 = dieselbe Frequenz wie die Computertaste dort, in 12-EDO und Bohlen-Pierce**; Kanal unter dem ersten spielt nichts; Lernen von Taste + Kanal; Pedal hält die Sustain-Taste genau einmal; gelerntes Pad bewegt das Keyboard-Fenster wirklich um eine Stufe und spielt keinen Ton; Programmtaste → beliebige Computertaste; Entfernen; Speicher; Profile je Gerät; Bericht.
- `tests/e2e/hwkeyboard_live.cjs` (HWKB-01: 12-EDO / 31-EDO / Tritave, Mute-Pattern, Fenster, Fehlerpfade) unverändert grün.

## Grenzen (ehrlich)
- **Keine echte Hardware, kein echtes Lumatone, kein MPE-Gerät.** Die Regeln folgen dem MIDI-1.0-Standard und den üblichen Konventionen; ob ein bestimmtes Gerät Besonderheiten hat, zeigt erst der Gerätebericht einer Person mit Gerät. Lumatone (nachgeschlagen in der Hersteller-Hilfe, 14.11.2026): Jede der 280 Tasten ist im Lumatone-Editor frei mit Kanal (1–16) und Tastennummer (0–127) belegbar; der Editor teilt das Instrument in fünf Felder zu 56 Tasten und empfiehlt für mikrotonale Stimmungen, den Kanal **nach der Größe der Stimmung** weiterzuzählen (ein Kanal pro Periode) statt nach vollen 128 Nummern. Genau das bildet „Tasten pro Kanal“ ab (56 für feldweise Belegung, sonst die Stufenzahl einer Periode); es gibt also keine eine feste Werksbelegung, auf die sich XenSonar verlassen dürfte, deshalb einstellbar und lernbar. Die geometrische Lage der Waben kennt XenSonar nicht: die Reihenfolge ist die der Tastennummern des Geräts (im Lumatone-Editor frei belegbar).
- MPE: nur die Tasten mit Anschlagsstärke. Tonhöhenbiegung und Druck pro Finger werden nicht ausgewertet (das Raster bestimmt die Tonhöhe; Druck → Ausdruck wäre eine spätere Stufe).
- Anschlagsdynamik wirkt auf alle Stimmen, die ihre Lautstärke aus `pL` nehmen (ein Aufrufer für Wave Starter und Tastatur), und auf Psy Lab. Je Klangfamilie (Entrophon, Nodal, Sample) ist das **nicht einzeln gemessen und nicht gehört**; gemessen ist der Faktor am Stimm-Starter der Standard-Tastaturstimme.
- Bedienelemente sind Schalter (gehalten / los), keine stufenlosen Regler: ein Modulationsrad hält Swell, es dosiert ihn nicht.
- Loslass-Stärke (Note-Off-Velocity) und Druck werden nicht verwendet.
- Web MIDI: Verfügbarkeit je Browser wie in HWKB-01 (Chromium-Familie ja, Firefox mit eigener Berechtigung, Safari nicht; sichere Seite nötig). Nur Chromium ist hier gelaufen.
- Raum V (Psy-Lab-Pad) hat ein eigenes Tastensystem und ist weiter nicht angebunden.
- Latenz und Spielgefühl: nicht messbar ohne Gerät.

Rollback: Commit `d18c33a` (Merge HWKB-01) bzw. `a594f20` (ganz ohne Hardware-Keyboard).

Quellen zum Lumatone: https://help.lumatone.io/en/creating-mappings/basic-approaches-to-lumatone-mappings · https://www.lumatone.io/features
