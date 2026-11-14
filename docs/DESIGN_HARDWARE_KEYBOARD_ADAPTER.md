# Entwurf · Hardware-Keyboard-Eingabeschicht (ohne Code)

Stand: 14.11.2026. Status: ENTWURF, nichts implementiert, nichts mit echter Hardware getestet.
Zone: WARM (Eingabe), Modul KALT (wird erst geladen, wenn die Schicht eingeschaltet wird).

## Ziel
Ein USB-Keyboard soll XenSonar so spielen wie die Computertastatur: dieselben Slots, dieselben Rasterstufen, dieselbe Stimmung (auch Tritave oder JI), zusätzlich mit Anschlagsstärke. Keine MIDI-Klänge, keine Dateien, keine Ausgabe: MIDI ist nur das Protokoll, in dem der Browser die Hardware liest (Web MIDI).

## Was aus dem Code feststeht (gelesen, nicht gemessen)
- Der Hauptraum kennt 20 Notenpositionen (`1…0`, `Q…P`), mit der dritten Reihe im Modus „keyboard-extension" 32 (`__xenMainKeyboardWindowSize`, `__xenThirdKeyboardRowIndex`, `src/runtime/01_instrument_state.js`).
- Eine Position ist ein Index in die offenen Rasterstufen ab einem Fenster-Offset (`wF`, `src/runtime/instrument/01_voice_gradients_and_effects.js`). Gemutete Stufen werden übersprungen. Jenseits der Liste läuft der Index in die nächste Periode der Stimmung weiter; die Periode kommt aus der Stimmung selbst (`AF`), eine Tritave-Stimmung wiederholt sich also 3:1.
- `ß` / `Ü` verschieben das Fenster (`__xenWindowShiftDir`).
- Tasten-Einstieg: `bPe` (`src/rhythm/04_workspace_and_transport.js`). Dort werden Taste → Position → Tonhöhe → Wave-Starter-/Psy-Lab-/Hold-Stimme verdrahtet.
- Pro Slot gibt es schon eine Lautstärke (`holdSlotGain`, `__xenHoldSlotGain`): der natürliche Haken für die Anschlagsstärke.
- Psy Lab nimmt `vel` (Worklet-Wert bei 1 gedeckelt), das Pitchrad (`wheel`), Sustain (`sustain`) und Ausdruck (B/Alt) an (PSY-OCT/LANE-01).

## Entscheidungen (Nutzer, 14.11.)
1. Das Keyboard bekommt die tatsächlichen Notenausgänge der Stimmung: Eine Tritave ist eine Tritave. Es hängt an denselben Slots wie die Computertastatur; es moduliert nur zusätzlich mit der Anschlagsstärke.
2. Keine künstliche Obergrenze: so viele Tasten, wie das Gerät hat.

## Architektur
```
Gerät ──Web MIDI──▶ Adapter (kalt, lazy) ──▶ Eingabe-Ereignis {Position k, Stärke v, an/aus}
                                                │
                                   dieselbe Kette wie bPe (Fenster, Tuning, Muting, Hold-Slots)
```
- Der Adapter kennt keine Buchstaben und keine Tastaturbelegung (de/en). Er liefert nur Position, Stärke und an/aus.
- Hardware-Taste → Position: zusammenhängend ab einer einstellbaren Grundtaste (Hardware-Taste n = n-te offene Rasterstufe ab dem Fenster-Offset), nicht „12 pro Oktave". Positionen über 20/32 hinaus sind erlaubt, weil `wF` jeden Index annimmt.
- Oktav-/Transponier-Tasten des Geräts → derselbe Fenster-Schritt wie `ß`/`Ü`.
- Sustain-Pedal (CC64) → vorhandener Sustain-Besitzer (`setSustain`). Pitch Bend → Psy-Lab-Pitchrad. Modwheel / Aftertouch → B/Alt-Ausdruck. Alles über vorhandene Eingänge, kein zweiter Schalter.
- Anschlagsstärke: Rohwert 1–127 → einstellbare Kennlinie (weich/linear/hart, je Gerät speicherbar) → 0…1 → multipliziert die Slot-Lautstärke. Jede Klangfamilie muss das annehmen; das ist je Familie zu prüfen (siehe offen).
- Heiß/Kalt: Web-MIDI-Callbacks laufen im Hauptthread, ohne React-Update pro Nachricht, ohne Speicher/JSON im Ereignis, kein neuer Audioknoten. Die Einstellungen (Grundtaste, Kennlinie, Gerät) werden erst bei Ruhe gespeichert.

## Daten-Owner und Rückwärtskompatibilität
- Neue Einstellungen als optionale Felder im Hauptraum-Zustand, fehlend = Schicht aus. Keine Migration, bestehende Sitzungen, Presets und `.xenpack` bleiben unberührt.
- Gerätekennlinien in eigenem Browser-Schlüssel (wie `xensonar.keyboard.layout.v1`), nicht in Sitzungen.

## Tests
- Simulierte Web-MIDI-Nachrichten gegen eine nachgebaute `requestMIDIAccess` (Browser-Test): Taste → richtige Rasterstufe, Tritave-Stimmung bleibt Tritave, gemutete Stufen, Fenster-Verschieben, Sustain, Stärke → Pegel (nach Kennlinie).
- Negativ: Gerät abgezogen, Berechtigung verweigert, kein Web MIDI im Browser: die Computertastatur arbeitet unverändert.
- Echte Hardware, Latenz und Spielgefühl: nur mit dem Keyboard der Nutzerin / des Nutzers (hier nicht testbar).

## Entwicklung ohne Hardware (Nutzer, 14.11.: es gibt kein Keyboard; Ziel ist Bedienbarkeit für alle, die eins haben)
Weil kein Gerät zum Prüfen da ist, wird die Schicht defensiv und selbsterklärend gebaut, nicht auf ein Modell zugeschnitten:
- **Allgemeine MIDI-Regeln statt Gerätewissen:** alle Kanäle annehmen; Note On mit Stärke 0 gilt als Note Off; unbekannte Nachrichten still ignorieren; Pitch Bend als 14 Bit; Aftertouch (Kanal und Taste) optional; Gerät abziehen oder neu einstecken mitten im Spiel darf nichts hängen lassen (alle Töne dieses Geräts aus).
- **Anzeige statt Raten:** ein kleines Monitor-Feld (nur wenn die Schicht an ist) zeigt Gerätename und die zuletzt angekommenen Nachrichten (Taste, Stärke, Pedal). So sieht jemand sofort, ob und was sein Keyboard schickt, auch ohne dass ich das Modell kenne.
- **Kennlinie am Gerät einstellen:** Auswahl weich / linear / hart, dazu „Stärke fest" für Keyboards ohne Anschlagsdynamik (alle Tasten gleich laut) und optional ein kurzes Einmessen („einmal leise, einmal hart spielen"). Pro Gerät gemerkt.
- **Grundtaste lernen:** „Diese Taste ist Position 1" per Tastendruck statt Zahleneingabe.
- **Kein Zwang:** Standardmäßig aus. Verweigerte Berechtigung, fehlendes Web MIDI oder Fehler stören die Computertastatur nicht; der Hinweis steht an der Stelle, an der man die Schicht einschaltet.
- **Status ehrlich:** bis eine Person mit echtem Gerät es bestätigt, bleibt die Schicht als „CODE_PRESENT / UNIT_VERIFIED, nicht an Hardware geprüft" gekennzeichnet; im UI ein kurzer Hinweis „Neu · mit Ihrem Keyboard noch ungetestet, Rückmeldung willkommen".
- **Tests:** simuliertes `requestMIDIAccess` mit Geräten verschiedener Eigenheiten (mit/ohne Stärke, Note On 0 als Off, Ein-/Ausstecken, 25 und 88 Tasten, Pedal, Bend) und ein Fehlerpfad je Berechtigung. Browser-Verfügbarkeit (Chromium sicher; Firefox und Safari sowie lokal geöffnete Datei sind zu prüfen) wird vor dem Bau recherchiert, nicht angenommen.

## Offen
- Welche Klangfamilien nehmen heute eine Stärke an? Psy Lab ja (`vel`); klassische Stimmen, Entrophon und Hold-Muster: zu prüfen (`holdSlotGain` ist der wahrscheinliche Haken).
- Browser: Web MIDI ist nicht überall gleich verfügbar; Verhalten bei lokal geöffneter Datei zu prüfen.
- Pads, Drehregler und MPE: bewusst nicht in der ersten Stufe (kein Gerät zum Prüfen); als spätere Stufe vorgemerkt.
- Sollen Positionen jenseits des Fensters das Fenster mitnehmen (folgen) oder nur absolut abgebildet werden?
