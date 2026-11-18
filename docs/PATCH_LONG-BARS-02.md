# LONG-BARS-02 · 64-Takte-Drum-Muster werden gespeichert

**Zone:** KALT (Sitzungsspeicherung, Laden des Drum-Entwurfs). Kein Audio, kein Scheduler geändert.
**Dateien / Owner:** `src/sessions/v2-session-store.js` (`__xenDrumWorkspaceSafe`, Owner der Drum-Workspace-Daten in der Sitzung) und `src/rhythm/04_workspace_and_transport.js` (`__f351CleanDrumDraft`, Drum-Entwurf). Daten-Owner des Musters bleibt `__mlSharedDrumMachine`.
**Größe:** `index.html` +2 Bytes.

## Befund (Prüfung der offenen Punkte aus LONG-BARS-01)
- **Wiedergabe:** Ein 64-Takte-Muster spielt über alle 64 Takte. Gemessen am Lautsprecherausgang mit zwei Kicks (Takt 34 und Takt 64) bei 240 BPM: Abstand exakt 30,00 s = 30 Takte.
- **Speichern:** Nach dem Neuladen war das Muster weg, es kam das Werksmuster. Muster mit 2 und 4 Takten blieben erhalten.

## Ursache
Zwei Prüfungen ließen höchstens 768 Schritte zu (48 Takte × 16). Die Sitzungsspeicherung warf ein längeres Muster als „Drum Playground record is invalid“ ab, das Laden des Drum-Entwurfs verwarf es. LONG-BARS-01 (15.11.) hatte den Editor auf 64 Takte angehoben, diese beiden Grenzen aber übersehen. Muster über 48 Takte wurden deshalb seit dem 15.11. nicht gespeichert.

## Änderung
Beide Grenzen auf 2048 Schritte (64 Takte × 32 Segmente, die Obergrenze des Editors). Es wird nur mehr angenommen, vorhandene Daten bleiben unberührt; keine Migration.

## Tests
- Neu: `tests/e2e/long_bars_play_save.cjs` (64-Takte-Wiedergabe am Lautsprecherausgang, Muster nach dem Neuladen, Melodic Loop 64 Takte nach dem Neuladen): rot auf dem Parent, grün danach.
- `tests/e2e/long_bars.cjs` grün.

## Weiter offen
Senden eines 64-Takte-Melodic-Loops an Material/Root Follow und Hold-Pattern über 16 Takte sind nicht geprüft.

Rollback: den Commit vor diesem Patch nehmen (siehe `git log`).
