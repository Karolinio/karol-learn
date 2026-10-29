import { macheSkizze } from './mache';
import { Kasten, Pfeil } from './teile';

const ZEILEN = [
  { id: 'a', titel: 'A · Fremder Harness per CLI', unter: 'claude -p: Claude Code macht die Schleife' },
  { id: 'b', titel: 'B · Agent SDK', unter: 'Bibliothek mit fertiger Schleife' },
  { id: 'c', titel: 'C · Eigene Schleife gegen die API', unter: 'Tool-Loop, Limits, Logs schreibst du' },
  { id: 'd', titel: 'D · Router vor vielen Modellen', unter: 'z. B. OpenRouter, ein Cloud-Dienst' },
] as const;
const Y0 = 70;
const ABSTAND = 78;

export const vierWege = macheSkizze({
  id: 'vier-wege',
  titel: 'Vier Wege zum Harness',
  track: 'aie',
  themen: ['Harness', 'SDK'],
  kurztext: 'CLI, Agent SDK, eigene Schleife oder Router. Deployment ist kein Weg.',
  viewBox: '0 0 360 456',
  schritte: [
    { titel: 'Woher kommt die Schleife?', text: 'Du willst einen Agenten. Die Schleife um das Modell, der Harness, muss irgendwo herkommen. Es gibt vier Wege.', karte: 'aie-vier-wege', fokus: ['du'] },
    { titel: 'A · Fremder Harness per CLI', text: 'Du startest einen fertigen Harness als Programm, z. B. claude -p. Schnell da, aber du steuerst nur von außen.', karte: 'aie-claude-p', fokus: ['a', 'pa'] },
    { titel: 'B · Agent SDK', text: 'Ein Agent SDK bringt die Schleife als Bibliothek mit. Du schreibst Tools und Regeln in deinem Code.', karte: 'aie-agent-sdk-harness', fokus: ['b', 'pb'] },
    { titel: 'C · Eigene Schleife', text: 'Du rufst die Modell-API selbst und baust die Schleife. Volle Kontrolle, mehr Arbeit.', karte: 'aie-harness-5-loop', fokus: ['c', 'pc'] },
    { titel: 'D · Router', text: 'Ein Router wie OpenRouter ist ein Cloud-Dienst vor vielen Modellen: eine API, viele Anbieter.', karte: 'aie-abo-vs-api', fokus: ['d', 'pd'] },
    { titel: 'Kein Weg: Deployment', text: 'Deployment ist kein fünfter Weg. Es sagt nur, wo A, B, C oder D läuft: Laptop, Server, Container.', fokus: ['nein'] },
  ],
  zeichnung: () => (
    <>
      <Kasten id="du" x={40} y={8} b={304} h={46} titel="Dein Agent braucht einen Harness" />
      <Pfeil id="spine" ab={1} d={`M24 31 L24 ${Y0 + 3 * ABSTAND + 33}`} ohneSpitze gestrichelt />
      {ZEILEN.map((z, i) => (
        <g key={z.id}>
          <Pfeil id={`p${z.id}`} ab={i + 1} d={`M24 ${Y0 + i * ABSTAND + 33} L36 ${Y0 + i * ABSTAND + 33}`} />
          <Kasten id={z.id} ab={i + 1} x={40} y={Y0 + i * ABSTAND} b={304} h={66} titel={z.titel} unter={z.unter} links />
        </g>
      ))}
      <Kasten id="nein" ab={5} x={40} y={392} b={304} h={56} titel="Kein Weg: Deployment" unter="nur der Ort, wo einer davon läuft" art="nein" links />
    </>
  ),
});
