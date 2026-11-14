# HWKB-01 · Hardware-Keyboard-Eingabeschicht, Stufe 1 (Tasten, Monitor, Gerätebericht)

Parent: `3eb3520`+Doku (`520d5ad`), index.html 8 082 843 Bytes. Rollback: `520d5ad`.
Neu: index.html 8 098 296 Bytes (+15 453), sha256 `bb9a4f949a699a1be47b9fc8889aeba31a0d3d63529a80abb87afd102fc1de55`.
Zone: WARM (Eingabe, Oberfläche). Nachrichtenbehandlung in reinem JS, kein React pro Nachricht (Monitor höchstens alle 120 ms). Standardmäßig aus: kein Web-MIDI-Aufruf, keine Listener und kein Audio, bis es eingeschaltet wird (beim Start nur ein Lesezugriff auf den eigenen Browser-Schlüssel).
Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED **mit simuliertem Gerät**. NICHT an echter Hardware geprüft (es gab keines). Entwurf: `docs/DESIGN_HARDWARE_KEYBOARD_ADAPTER.md`.

## Was es tut
Eine Hardware-Taste ist dasselbe Tastenereignis wie die Computertaste an ihrer Position (`bPe` liest `event.__xenHwPos`). Damit gelten unverändert: Keyboard-Fenster (ß / Ü), Stimmung samt Periode (Tritave bleibt Tritave), gemutete Stufen, Hold-Slots, Psy Lab, Tastenbesitz, rosa Linien im Live-Raum, Spiegelung wie bei den Computertasten (tiefste Taste = Position 1, steigt nach rechts). Mehr Tasten als 20 / 32 sind erlaubt; Tasten oberhalb der obersten Rasterlinie spielen nichts (nie eine falsche Note) und der Monitor sagt, warum (Fenster nach unten schieben); Tasten unterhalb der ersten Taste werden ignoriert und so angezeigt.

## Bedienung (alles ohne Code einstellbar)
Schmale Zeile „Keyboard · Hardware (MIDI)" in der technischen Kartenreihe neben dem Touchpad-Helfer (Karte „Time & Echo") mit Status und Knopf „Set up hardware keyboard…". Der Dialog enthält: Schalter an/aus, Gerät (alle / bestimmtes), Kanal (alle / 1–16), Voreinstellungen (typische Tastenzahlen: C2 / C3 / F1 / mittleres C / A0), erste Taste (Zahl, Name, „Learn first key"), Offset in Positionen, Monitor (letzte Nachrichten), „Copy device report" (Browser, Gerät, Zähler, Einstellungen, Fehler; keine Sitzungs- oder Personendaten, nichts wird gesendet; falls die Zwischenablage fehlt, erscheint der Text zum Kopieren).
Escape und „Close" schließen den Dialog, der Fokus geht zum Knopf zurück. Während der Dialog offen ist, spielen die Tasten weiter.

## Daten-Owner
Eigener Browser-Schlüssel `xensonar.hwkeyboard.v1` (Gerät, Kanal, erste Taste, Offset, Voreinstellung), bereinigt beim Lesen; nicht in Sitzungen, Presets oder `.xenpack`. Der Schalter selbst wird nie gespeichert (die Berechtigungsabfrage kommt bei jedem Einschalten). Keine Migration.

## Browser (Recherche, nicht selbst geprüft)
Chrome / Edge ja (mit Berechtigung), Firefox ab 108 mit Add-on-gebundener Berechtigung, Safari nicht; HTTPS nötig (Netlify ja). Bei fehlender Unterstützung oder verweigerter Berechtigung steht der Grund im Dialog und in der Zeile; die Computertastatur läuft unverändert (getestet).

## Geänderte Stellen
- Neu: `src/post-oct/037-xen-hardware-keyboard.js` (im Hauptbündel nach `036`), Zeile + Dialog in `src/myzel/01_effect_mapping.js` (`__XenTouchpadDock`).
- `bPe` (`src/rhythm/04_workspace_and_transport.js`): Position aus `__xenHwPos`, Bereichswächter oberhalb der Rasterlinien.
- Nicht lazy geladen (Zuwachs 15 453 Bytes im Bündel); ein Umbau zu einem verzögert geladenen Block wäre möglich, die Liste der Blöcke (`__xenLoadDeferred`) ist aber geschlossen.

## Tests
- `tests/hwkeyboard_core.cjs` (Unit, 122. Test in `run_tests.sh`): Parser (Note On 0 = Off, 14-Bit Bend, Echtzeit), Position, Kanal, Learn, Voreinstellungen, Persistenz und kaputter Speicher, keine Unterstützung, verweigert, Gerät abziehen, Bericht.
- `tests/e2e/hwkeyboard_live.cjs` (simuliertes `requestMIDIAccess`): kein Web-MIDI-Aufruf vor dem Einschalten; Hardware-Taste = Computertaste in 12-EDO, 31-EDO und Bohlen-Pierce (Periode 3:1), mit gemuteten Stufen, jenseits von 32 Tasten (nach Fensterverschiebung), Loslassen / Velocity-0 / Abziehen, Kanal, Learn, Voreinstellung, Monitor, Bericht, Dialog (Escape, Fokus), Fehlerpfade.
- Nicht prüfbar hier: Latenz, Spielgefühl, echte Geräte, Browser außer Chromium.

## Offen / nächste Stufe
- Stufe 2: Anschlagsstärke (Kennlinie weich / linear / hart / fest, Einmessen; Haken wahrscheinlich `holdSlotGain`, je Klangfamilie zu prüfen), Sustain-Pedal (CC64) auf den Sustain-Besitzer, Pitch Bend auf das Psy-Lab-Rad, Modwheel / Aftertouch auf den B/Alt-Ausdruck.
- Raum V (Psy-Lab-Pad) hat ein eigenes Tastensystem: noch nicht angebunden.
- Pads, Drehregler, MPE: bewusst später.
