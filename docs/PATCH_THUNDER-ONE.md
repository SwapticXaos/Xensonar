# THUNDER-ONE · Ein Hold-Mechanismus für alle Synths: Nodals Uhr, erweitert statt nachgebaut

Basis: `009984e` (LOOPREC-BARS-01) bzw. die Rücknahme von THUNDER-CLOCK-01/02 (`3208d05`, `8946e0a`), `index.html` 8 159 358 B. Jetzt 8 157 315 B (**−2 043 B**).
Zone: HEISS (Worklet-Uhr, Stem-Mix) und WARM (Übergabe im Hauptraum). Pro Schritt keine Allokation außer dem Leser-Eintrag, den es vorher auch gab; kein React, kein Speicher, kein JSON im Takt.
Daten-Owner: unverändert. Neuer Parameter `thunderTiming` (`exact` Vorgabe / `loose`) in den Live-Parametern, additiv; fehlt er, gilt Exact.
Status: CODE_PRESENT, UNIT_VERIFIED (echter WASM-Kern), BROWSER_CHECKED (Chromium headless). **Nicht gehört**, nicht USER_ACCEPTED, nicht auf deinem Gerät geprüft.

## Was falsch war (dein Befund)
THUNDER-CLOCK-01/02 hat neben Nodals Mechanismus eine **zweite** Zeitsteuerung gebaut (Haupt-Thread plant Pulse mit Vorlauf). Das war doppelter Code und nicht Nodals Mechanismus. Beides ist zurückgenommen (`3208d05`, `8946e0a`).

Beim genauen Hinsehen gab es aber schon **vorher** zwei getrennte Hold-Uhren im Audio-Thread:
- **Nodal** (PRECISION02): Die Uhrbeschreibung (Start, Intervall, Muster, Slot-Lautstärken, Mikrotiming, Tonhöhenschritte) reist mit dem Ton in den Nodal-Worklet; der Worklet spielt jeden folgenden Schritt selbst. Der Haupt-Thread schickt danach nur noch Uhr-Updates.
- **Entrophon / klassische Klänge** (C11-Worklet, „Hold Resident“): Die ersten Pulse spielte der **Haupt-Thread**; erst nach einem Handshake über mehrere Nachrichten-Runden (PLAN → COMMIT → READY → GO → GO_READY → FIRE, oft erst nach einer PCM-Vorberechnung in einem Worker) übernahm eine **eigene** Uhr im C11-Worklet, mit eigener Schrittrechnung **ohne** Mikrotiming und **ohne** Slot-Lautstärken. Bei Mustern mit Slot-Lautstärken oder Mikrotiming übernahm sie gar nicht: dann spielte der Haupt-Thread jeden Puls (bei Nodal nicht).

Die Lücke selbst konnte ich hier nicht hörbar nachstellen (Headless-Chromium, auch mit 90–150-ms-Rucklern, großen Audiopuffern, Tonhöhenschritten: keine fehlenden Schritte). Die Stellen, an denen sie auf einem echten Gerät entstehen kann, sind genau die, die Nodal nicht hat: Pulse vom Haupt-Thread (ruckelt das Gerät, kommt der Puls zu spät oder gar nicht) und die Übergabe (ein FIRE, das bei großen Audiopuffern zu spät im Worklet ankommt, verwirft den Übergabeschritt). Beides gibt es jetzt nicht mehr.

## Änderung
1. **Eine Uhr, eine Quelle.** Nodals Uhr ist jetzt drei Funktionen in `src/nodal/04_audio_runtime.js`: `xenHoldClockCheck` (gültige Beschreibung, liefert Slot-Lautstärken und Mikrotiming), `xenHoldClockTime` (Rasterstart/Intervall, Tempowechsel behält die nächste Schrittnummer), `xenHoldStepFrame` (Audio-Frame von Schritt i, Mikrotiming eingeschlossen). **Beide** Worklets laden genau diesen Quelltext: Nodal (wie bisher, nur ausgelagert, gleiche Ausdrücke) und der C11-Worklet (neu).
2. **C11 übernimmt wie Nodal.** Der erste Puls einer gehaltenen Taste wird gespielt wie immer; seine Records gehen **zusammen mit der Uhrbeschreibung der Geste** (dieselbe, die Nodal bekommt) an den C11-Worklet, und der **Commit ist die Übernahme**: ab dem nächsten Schritt spielt die Uhr im Audio-Thread, der Haupt-Thread startet für diese Taste keinen Ton mehr. Kein READY/GO/FIRE, kein Haupt-Thread-Vorlauf, kein Initial-Worker. Die Schritte klingen zunächst live im Kern und nach wenigen Renderblöcken (≈13 ms) aus dem PCM, das der Worklet selbst vom Ton rechnet (wie bisher der „tap“-Modus; bitgenau derselbe Klang).
3. **Slot-Lautstärke, Mikrotiming und Tonhöhenschritte** gelten auf der C11-Uhr wie bei Nodal. Die Ausnahme „bei Lautstärke-/Mikrotiming-Mustern spielt der Haupt-Thread“ entfällt für Entrophon/klassisch. Die Slot-Lautstärke wird einmal angewendet: relativ zu dem Pegel, den der Stimmstarter beim aufgenommenen Ton wirklich angewendet hat (`__xenHoldCaptureGain`), Tonhöhenschritte relativ zur Tonhöhe des aufgenommenen Tons.
4. **Der PCM-Erzeuger hält mit transponierten Schritten mit** (ein Schritt eine Quinte höher liest 1,5× schneller): bis zu drei Blöcke pro Renderblock, nur so viel wie die Leser brauchen.
5. **Alte Variante wählbar** („Feature-Bug“): Schalter **Exact / Loose** neben Q in der Hold-Zone. *Loose* = der alte Weg, jeder Puls vom Haupt-Thread, für Nodal als Einzelton pro Puls, für C11 ohne Uhr.

Entfernt (Verschlankung): Handshake READY/GO/GO_READY/FIRE in Host und Worklet, `HOLD_TAP_INITIAL`, Initial-Warteschlange des PCM-Workers (`initial`, `queueable`, `cancel`), doppelte Validierung und Schrittrechnung, Übergabezähler. Der PCM-Worker bleibt für das Umfärben (X-Klangfarbe) im Gebrauch.

## Für neue Synths
Ein neuer Synth an Wave Starter oder Keyboard bekommt die Uhr, ohne dass etwas nachgebaut wird:
- Rendert er im C11-Kern (Records): automatisch, über den vorhandenen Capture-Aufruf.
- Hat er einen eigenen Worklet: Er nimmt die Uhrbeschreibung, die der Hold-Puls ohnehin mitliefert (`nodalHoldClock` in den Pulsoptionen), und lädt `xenHoldClockSource()` in seinen Worklet (eine Zeile, wie C11 und Nodal). Schrittlogik: `holdClock.check / time / step`.
- Ohne beides spielt er wie bisher Puls für Puls (Loose-Verhalten). Loop-Rec nimmt ihn über den Spureingang ohnehin auf (LIVE-LANE-01).

## Prüfung
- **Unit, echter WASM-Kern** `tests/hold_resident_processor.cjs` (grün, im 125er-Satz): Commit = Übernahme, kein READY/GO; Maske, kein Aufholschwall nach Uhrsprung, STOP sperrt späten Commit, falsche Epoche und ungültige Uhr werden abgelehnt. **C11-Schritte liegen auf genau den Frames von Nodals Schrittfunktion**, Mikrotiming eingeschlossen; zwei Schritte in einem Renderblock spielen beide; Slot-Lautstärke 0,5 = exakt halbes PCM (Fehler 0).
- **PCM vorher/nachher**: Stem-Wiedergabe in 8 Konfigurationen (44,1/48 kHz, beide Ausgabewege, 24/27/32 Slots, Galopp, komplexe 3-Record-Klänge) **bitgenau identisch** (Hash-Vergleich gegen den alten Stand); PCM-Orakel unverändert (max. 1,2·10⁻⁷ gegen die Live-Kern-Summe, wie vorher).
- **Browser** `tests/e2e/thunder_one_clock.cjs` (echte App, Entrophon-Werksklang, Keyboard Hold 3 s): Haupt-Thread startet 2 Töne, die Uhr die übrigen 20 (22 erwartet, 0 verloren); mit Lautstärke-, Mikrotiming- und Tonhöhenmuster dasselbe (vorher: jeder Puls vom Haupt-Thread); **Haupt-Thread alle 400 ms für 150 ms blockiert: 0 verlorene Schritte**; Loose: 0 Uhr-Schritte, jeder Puls vom Haupt-Thread; Schalter wirkt. 3/3 Läufe grün.
- **Pegel gemessen** (Loop-Rec-Aufnahme, Muster 1 / 0,25): laute Schritte 0,434 (= ohne Muster 0,434), leise ≈ 0,25 davon. Im alten Weg (Loose) war das Lautstärkemuster bei diesem Entrophon-Klang **gar nicht hörbar** (alle Pulse 0,435): der Direktpfad filtert die Slot-Lautstärke heraus (siehe HWKB-02).
- `build.py --check`, `run_tests.sh` (125 grün), `run_e2e.sh` vollständig grün.

## Grenzen / offen
- **Nicht gehört, nicht auf deinem Gerät.** Ob die Lücke, die du hörst, damit weg ist, zeigt nur dein Gerät. Wenn nicht: bitte sagen, an welcher Stelle (gleich nach dem Anschlag, nach ~1 s, regelmäßig, beim Bewegen), welcher Klang und welcher Browser.
- Der Anschlag und der erste Puls kommen wie bei Nodal vom Haupt-Thread (beim Anschlag existiert die Geste noch nicht; das gilt für Nodal genauso). Bei Entrophon klingen diese beiden ersten Töne im Exact-Modus noch ohne Slot-Lautstärke (alter Filter im Direktpfad, bewusst nicht angefasst).
- Direkt nach Power kann die bestehende Stimmen-Zulassung beim allerersten Anschlag einen Teilton ablehnen; dann übernimmt die Uhr absichtlich nicht (ein unvollständiger Klang würde sonst wiederholt) und der Haupt-Thread spielt die Taste bis zur nächsten Session (≤ 400 ms) weiter – ohne Lücke, aber mit Haupt-Thread-Timing.
- Slot-Lautstärke auf der C11-Uhr skaliert den Klang des aufgenommenen Tons (wie Nodal: ein Klang, Pegel je Slot). Im alten Weg wurde (wo sie ankam) jeder Puls mit anderer Lautstärke neu synthetisiert; bei Klängen mit Sättigung kann das minimal anders klingen. Nicht gehört.
- Tonhöhenschritte auf der C11-Uhr werden wie bisher nach der Übernahme per Umrechnung des PCM gespielt (Tonhöhe und Hüllkurve verschieben sich gemeinsam), nicht neu synthetisiert. Unverändert gegenüber vorher, nur früher aktiv.
- Bei Klängen mit mehr als 8 Records pro Ton (bisher schon so) übernimmt die Uhr nicht; sie laufen wie Loose.
- Nodal: Code nur ausgelagert, gleiche Ausdrücke; die Prüfung akzeptiert jetzt größere Bereiche (Tonhöhe 0,25–4, Lautstärke bis 64), die Nodal von der Oberfläche nie bekommt (Cent ±1200, Lautstärke ≤ 1,5). Kein eigener PCM-Vergleich für Nodal (keine Arithmetik geändert).

Rollback: Commit `8946e0a` (Rücknahme THUNDER-CLOCK, Stand vor THUNDER-ONE) bzw. `009984e`.
