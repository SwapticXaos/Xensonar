# FORGE-SPEC-TOGGLE-01 (19.11.2026)

Zweig `claude/stoic-knuth-a6nx6f`. Zone: WARM, nur Ansicht (Spectral Forge, Kopfzeile des Carrier-Fensters). Kein Audiopfad.
Daten-Owner: `__ForgeSpectrumShow` (src/rooms/lab.js, nur im Speicher, Standard an); Ebene: `ForgePCMSpectrumOwner`.

- Neuer Symbol-Button direkt links neben Undo (`data-forge-spectrum-toggle`). Das Symbol ist eine Miniatur der Ansicht: der Carrier als Linie mit Verlauf wie auf der Zeichenfläche (außen rot, dann orange, Kern gelb), darüber die Obertöne als türkise Silhouetten.
- **An (Standard):** Linie plus türkise Silhouetten, die gemessene „heard spectrum“-Ebene wird über dem Carrier gezeigt.
- **Klick = aus:** die türkisen Silhouetten verschwinden auf dem Button und die türkise Ebene über dem Carrier ist ausgeblendet; es bleibt nur der Carrier (Symbol: nur die Linie). Solange aus, läuft keine neue Spektrum-Messung. Das zuletzt gemessene Bild bleibt erhalten und erscheint beim Wiedereinschalten sofort (Status „Previous spectrum“ bis zur nächsten Wiedergabe).
- Vorher gab es die Ebene nur ohne Schalter (die Zustandsvariable `shown` war immer `true`). Der Zustand wird nicht gespeichert und nicht migriert; nach dem Neuladen ist er wieder an.
- Test: `tests/e2e/forge_spectrum_toggle.cjs` (Lage neben Undo, Standard an, Symbol an/aus, Ebene `display` block/none, Zustand nach Aus/An). In Headless-Chromium entsteht keine gemessene Silhouette („Play to measure“); die türkise Darstellung selbst wurde deshalb nicht beobachtet, nur der Schalter und das Ein-/Ausblenden der Ebene. Nicht gehört, nicht in Firefox gesehen.
- `index.html` +≈ 0,6 KB.
