# Meter-Bench (Taktometer · Song-Teile)

Prüfstand für `src/rooms/00_meter_analysis.js` (Taktometer: Analyze, Fit to target, Loop korrigieren) und
`src/rooms/00_song_parts.js` (farbige Teile-Leiste im Wave Editor) mit echtem Audio.

- **Beliebige Aufnahmen** (z. B. eigene Udio-Songs): `node tools/meter_bench/bench.cjs <ordner>` – zeigt Taktart, BPM,
  Gruppierung und Teile je Datei (braucht `ffmpeg`).
- **Progressive Stücke mit exakter Wahrheit** (5/4, 7/8, 7/4, 9/8, 11/8, 13/8, 6/8, Taktwechsel 4/4→7/8→4/4):
  ```
  python3 -m pip install mido
  python3 tools/meter_bench/gen_prog.py <ordner>          # MIDI + truth.json
  for m in <ordner>/*.mid; do fluidsynth -ni -q -r 44100 -F "${m%.mid}.wav" /usr/share/sounds/sf2/FluidR3_GM.sf2 "$m"; done
  node tools/meter_bench/bench.cjs <ordner> <ordner>/truth.json
  ```
  (`apt-get install fluidsynth fluid-soundfont-gm`). Stand 24.11.2026: Song-Taktart 8/8, Teile 7/8, Taktometer 47/52 exakt
  (51/52 unter den ersten drei Lesarten).
- **Freie echte Aufnahmen** zum Gegenprüfen: `git clone --depth 1 https://github.com/librosa/data` → `audio/*.hq.ogg`
  (CC-Lizenzen je Datei, nicht ins Repo kopieren).
