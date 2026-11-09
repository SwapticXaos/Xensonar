import { DRUM_PLAYLIST_HOTKEY_HELP } from "../drumPatternPlaylistHotkeys";

export function ResonanceGuidePanel() {
  return (
    <div className="mt-4 bg-black p-4 border border-neutral-800 text-neutral-400 text-sm">
      <h3 className="text-xs text-pink-400 uppercase tracking-widest mb-2 font-bold border-b border-neutral-800 pb-1">Bedienungsanleitung & Steuerung</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <div>
          <h4 className="text-neutral-300 font-semibold mb-1">Performance & Wellen</h4>
          <ul className="space-y-1">
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Maus</kbd> oder <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Touch</kbd>: Fokus-Vektor (Pitch / Spektrum) bewegen</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Pfeiltasten</kbd>: Cursor bewegen (rastet bei "Cursor an Raster anpassen" exakt ein)</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Links-Klick</kbd> oder <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Enter</kbd>: Resonanz-Ripple (Ringwelle) abfeuern; bei aktivem Enter-Hold-Gerät färbt gehaltenes Enter die Wellenstarter zusätzlich</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Rechtsklick</kbd>: nur Echo an/aus (keine Ringwelle)</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Y</kbd> <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">X</kbd> <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">C</kbd> <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">V</kbd>: Gerichtete Sektorwellen feuern (Links, Rechts, Oben, Unten)</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Space</kbd> (halten): Alle waehrenddessen neu gespielten Wellenstarter schwellen an; der Grundton wird wieder mit angehoben, waehrend die tiefere Lage erhalten bleiben darf; nach Loslassen schwillt es schnell ab</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Backspace</kbd> (halten): Wellenstart-Sound sowie Klaviatur- und Pfeiltasten-Sound (gleicher Sound ohne Welle) werden eine Oktave hoeher gespielt</li>
          </ul>
        </div>
        <div>
          <h4 className="text-neutral-300 font-semibold mb-1">Harmonische Steuerung</h4>
          <ul className="space-y-1">
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">1 - 0</kbd> und <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Q - P</kbd>: OR-Klaviatur auf dem aktuellen Raster spielen</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">?/ß</kbd> und <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Ü</kbd> (deutsche Tastatur): Fenster der Klaviatur verschieben; <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Ü</kbd> liegt hinter <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">P</kbd></li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">^/°</kbd>: Hotkeys zwischen Materialspur und Root Follow Loop umschalten; die fruehere Klaviatur-Spiegelung ist aus dieser Taste entfernt</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">M / N</kbd>, <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">, / .</kbd> sowie <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">AltGr / Strg</kbd>: Partikel Modus / Raster System / Raster Modus durchschalten</li>
            <li>Der Kammerton ist dabei der Grundton-Anker: Raster System und Raster Modus lesen ihre Stufen relativ zu dieser Hz-Basis.</li>
            <li>Custom Tuning im Raster: links auf das kleine Dreieck einer Linie klicken zum Muten/Entmuten, oder nach oben/unten ziehen fuer manuellen Step-Offset (Feintuning pro Stufe)</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Tab</kbd>: Partikel-Zeitkörper durchschalten (16/24/27/32/64 Slots); <span className="text-neutral-300">other</span> und Bezugstakte stellst du im Quantisierungsmenü ein.</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">-_</kbd>: Partikel-System durchschalten</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">´ / `</kbd>: Töne halten; loslassen dämpft schnell ab</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">A - #</kbd>: Hotkeymodi. Im Partikelmodus schalten A - # Partikel-Sounds an und aus; Anschalten lässt das Partikel klingen.</li>
            <li>In den Loop-Modi <span className="text-pink-300">📀 Materialspur</span> und <span className="text-cyan-200">🎼 Root Follow Loop</span>: <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">A - L</kbd> springend zwischen den obersten neun Playlist-Einträgen schalten; die Reihenfolge ist im jeweiligen Menü in der Kopfzeile unter 📀 und 🎼 organisierbar.</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Ö</kbd> / <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Ä</kbd>: durch ältere Einträge zappen. <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">#</kbd>: Loop an/aus bzw. kill/restart.</li>
            <li>Materialspur und Root Follow Loop kannst du vorgeschnitten mit Taktangabe direkt hochladen oder im Materialschmiede-Bereich basteln/komponieren.</li>
            <li><kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Caps Lock</kbd> / <kbd className="bg-neutral-800 px-1 py-0.5 rounded text-xs text-white">Shift links</kbd>: Drum Pattern rauf/runter ({DRUM_PLAYLIST_HOTKEY_HELP}) — unter 🥁 in der Kopfzeile kannst du die Reihenfolge deiner Lieblings-Beats festlegen und gelangst auch direkt zur Drum Machine im Materialschmiede-Bereich, wo es noch mehr zu entdecken gibt.</li>
            <li>Für das Bass-Menü 🎸 gibt es aktuell noch keine Hotkey-Zuordnung, aber eigene Bassläufe kannst du auch dort schon speichern.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
