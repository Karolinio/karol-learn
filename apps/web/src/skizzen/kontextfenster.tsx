import { macheSkizze } from './mache';
import { Kasten, Notiz, Pfeil, Teil } from './teile';

const X = 36;
const B = 166;

export const kontextfenster = macheSkizze({
  id: 'kontextfenster',
  titel: 'Das Kontextfenster',
  track: 'aie',
  themen: ['Kontext', 'Kosten'],
  kurztext: 'Was alles im Fenster steckt, was Input und Output ist und was Compaction macht.',
  viewBox: '0 0 360 416',
  schritte: [
    { titel: 'Ein Fenster, feste Größe', text: 'Das Kontextfenster ist alles, was das Modell bei einem Aufruf sieht. Seine Größe ist in Tokens begrenzt.', karte: 'aie-fenster-grenze', fokus: ['fenster'] },
    { titel: 'System-Prompt und Tools', text: 'Oben stehen der System-Prompt und die Beschreibungen aller Tools. Sie kommen bei jedem Aufruf mit.', karte: 'aie-system-prompt', fokus: ['system', 'tools'] },
    { titel: 'Verlauf', text: 'Dann der bisherige Verlauf: Nachrichten, Tool-Bitten, Tool-Ergebnisse. Er wächst mit jeder Runde.', karte: 'aie-kein-gedaechtnis', fokus: ['verlauf'] },
    { titel: 'Neue Frage', text: 'Unten die neue Frage. Alles bis hier sind Input-Tokens, auch das, was du nicht selbst geschrieben hast.', karte: 'aie-input-tokens', fokus: ['frage', 'k-input'] },
    { titel: 'Antwort', text: 'Die Antwort des Modells sind Output-Tokens. Sie belegen auch Platz im Fenster und kosten pro Token mehr.', karte: 'aie-output-tokens', fokus: ['antwort', 'k-output'] },
    { titel: 'Gecachter Präfix', text: 'Bleibt der Anfang exakt gleich, kann er gecacht werden: günstiger und schneller. Eine Änderung oben bricht den Cache.', karte: 'aie-cache-praefix', fokus: ['cache', 'system', 'tools'] },
    { titel: 'Compaction', text: 'Wird es voll, fasst der Harness den alten Verlauf zusammen. Platz wird frei, Einzelheiten gehen verloren.', karte: 'aie-compaction', fokus: ['compaction', 'frei'] },
  ],
  zeichnung: () => (
    <>
      <Kasten id="fenster" x={24} y={8} b={190} h={400} titel="Kontextfenster" art="rahmen" r={20} />
      <Kasten id="system" ab={1} x={X} y={40} b={B} h={44} titel="System-Prompt" r={10} />
      <Kasten id="tools" ab={1} x={X} y={88} b={B} h={48} titel="Tool-Beschreibungen" r={10} />
      <Kasten id="verlauf" ab={2} x={X} y={140} b={B} h={104} titel="Verlauf" unter="Nachrichten, Ergebnisse" r={10} />
      <Teil id="compaction" ab={6} versteckt kinder={
        <>
          <rect x={X + 1} y={141} width={B - 2} height={102} rx={10} className="sk-flaeche sk-flaeche--deck" />
          <rect x={X + 6} y={146} width={B - 12} height={32} rx={8} className="sk-flaeche sk-flaeche--akzent" />
          <text x={X + B / 2} y={167} className="sk-unter sk-unter--stark" textAnchor="middle">Zusammenfassung</text>
          <rect x={X + 6} y={184} width={B - 12} height={54} rx={8} className="sk-flaeche sk-flaeche--frei" />
          <text x={X + B / 2} y={215} className="sk-unter" textAnchor="middle">alter Verlauf: frei</text>
        </>
      } />
      <Kasten id="frage" ab={3} x={X} y={248} b={B} h={36} titel="Neue Frage" r={10} />
      <Kasten id="antwort" ab={4} x={X} y={292} b={B} h={48} titel="Antwort" unter="vom Modell" r={10} />
      <Kasten id="frei" ab={0} x={X} y={344} b={B} h={56} titel="frei" art="leise" r={10} />
      <Pfeil id="k-input" ab={3} d="M226 42 Q234 42 234 52 L234 272 Q234 282 226 282" ohneSpitze />
      <Notiz id="k-input" ab={3} x={244} y={206} zeilen={['Input-', 'Tokens']} art="stark" />
      <Pfeil id="k-output" ab={4} d="M226 294 Q234 294 234 302 L234 330 Q234 338 226 338" ohneSpitze />
      <Notiz id="k-output" ab={4} x={244} y={312} zeilen={['Output-', 'Tokens']} art="stark" />
      <Pfeil id="cache" ab={5} d="M256 42 Q264 42 264 52 L264 126 Q264 136 256 136" ohneSpitze />
      <Notiz id="cache" ab={5} x={274} y={84} zeilen={['gecacht', '(gleicher', 'Anfang)']} art="akzent" />
    </>
  ),
});
