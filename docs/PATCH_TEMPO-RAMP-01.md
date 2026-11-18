# TEMPO-RAMP-01 · Tempo-Übergang im Live Room (Time & Echo)

Status: CODE_PRESENT, UNIT_VERIFIED, BROWSER_CHECKED (Chromium). Nicht gehört. Zone: WARM (Hauptthread, nur während des Übergangs aktiv).
Parent `e6bc40b`, `index.html` 8 277 542 → 8 280 448 B (+2 906). Rollback: `e6bc40b`.

## Wunsch (Nutzer, 18.11.)
„From current to X BPM in Y Takten“, mit Go; langsames Drosseln oder Anheben des Tempos. Kein zusätzlicher Platz: Innerhalb der Spalte darf verschoben werden, die Spalte darf nicht länger werden (sonst würden alle Spalten mitwachsen).

## Umsetzung (Owner: vorhandener Tempo-Setter des Reglers „Live Room Tempo“, `onQuantizeBpmChange` → `lhe`)
- Zeile direkt unter dem Tempo-Regler: `Tempo → [BPM] BPM in [Takte] bars [Go]`; während des Laufs `Stop · aktuell → Ziel`. Enter in einem der Felder startet ebenfalls.
- Keine zweite Uhr, kein neuer Tempo-Zustand: pro ganzem BPM-Schritt genau ein Aufruf des Setters, den auch der Regler benutzt (40–240 BPM). Alles, was dem Regler folgt, folgt dem Übergang.
- Das Tempo ändert sich gleichmäßig pro Schlag; die Länge zählt Schläge am tatsächlich gesetzten Tempo. 1 Takt = 4 Schläge (wie Loop-Rec), Bruchteile von Takten erlaubt (0,25 Schritt).
- Wer den Tempo-Regler bewegt, übernimmt sofort (Übergang stoppt).
- Platz: Spalten- und Seitenhöhe bei 1024/1440/1920 px vorher und nachher identisch gemessen; der Inhalt der Spalte rückt in die vorhandene Lücke über dem Touchpad-Block.

## Tests
- `tests/tempo_ramp_01.test.cjs` (simulierte Uhr): jeder Schritt einmal, monoton, Ziel erreicht; Dauer nach Schlägen (60→120 in 2 Takten ≈ 5,3 s); Stop; gleiches Tempo/0 Takte; Bereich 40–240.
- `tests/e2e/tempo_ramp.cjs`: Go, 108 → 120 in 1 Takt = 13 Schritte in 2,26 s, Regler und gemeinsames Tempo folgen, Regler übernimmt, Spaltenhöhe gleich.
- `run_tests.sh` 132/132; Browser-Teillauf Live Room (inkl. Tasten-Wächter, Thunder, Stems, Power) 24/24.
