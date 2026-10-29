import { macheSkizze } from './mache';
import { Kasten, Notiz, Pfeil } from './teile';

export const schichten = macheSkizze({
  id: 'schichten',
  titel: 'Runtime, Harness, Modell',
  track: 'aie',
  themen: ['Harness', 'Runtime', 'Tools'],
  kurztext: 'Drei Schichten ineinander. Das Modell führt nie etwas aus.',
  viewBox: '0 0 360 400',
  schritte: [
    { titel: 'Runtime', text: 'Ganz außen: der laufende Prozess auf einem Rechner, Laptop, Server oder Container. Er setzt Grenzen für Zeit, Speicher und Rechte.', karte: 'aie-runtime', fokus: ['runtime'] },
    { titel: 'Harness', text: 'Darin der Harness: der Code um das Modell. Er baut den Kontext, bietet Tools an, steuert die Schleife und setzt Limits.', karte: 'aie-harness', fokus: ['harness'] },
    { titel: 'Modell', text: 'Ganz innen das Modell. Es bekommt Text und liefert Text. Kein Dateizugriff, kein Netz, keine Hände.', karte: 'aie-modell', fokus: ['modell'] },
    { titel: 'Tool-Bitte', text: 'Will das Modell etwas tun, schreibt es eine Tool-Bitte: Name plus Parameter als JSON. Das ist nur Text.', karte: 'aie-tool-schema', fokus: ['p-bitte', 'bitte'] },
    { titel: 'Tool Runner', text: 'Der Tool Runner im Harness liest die Bitte, prüft sie und führt das Tool wirklich aus.', karte: 'aie-tool-runner', fokus: ['runner', 'p-aus'] },
    { titel: 'Tools', text: 'Tools sind Funktionen mit Namen und Schema, z. B. read_file oder send_email. Ihr Ergebnis geht zurück ins Modell.', karte: 'aie-tool', fokus: ['tools', 't1', 't2', 't3', 'p-zurueck', 'p-ergebnis'] },
    { titel: 'Der Kernsatz', text: 'Das Modell führt nie etwas aus. Es bittet, der Harness entscheidet und handelt, die Runtime begrenzt.', karte: 'aie-runtime-vs-runner', fokus: ['modell', 'runner', 'p-bitte', 'kernsatz'] },
  ],
  zeichnung: () => (
    <>
      <Kasten id="runtime" x={8} y={8} b={232} h={384} titel="Runtime" art="rahmen" r={24} />
      <Kasten id="harness" ab={1} x={22} y={40} b={204} h={338} titel="Harness" art="rahmen" r={20} />
      <Kasten id="modell" ab={2} x={40} y={76} b={168} h={62} titel="Modell" unter="liest Text, schreibt Text" />
      <Pfeil id="p-bitte" ab={3} d="M124 142 L124 244" />
      <Notiz id="bitte" ab={3} x={134} y={186} zeilen={['Tool-Bitte', '(nur Text)']} />
      <Pfeil id="p-ergebnis" ab={5} d="M60 248 L60 144" />
      <Notiz id="p-ergebnis" ab={5} x={68} y={200} zeilen={['Ergebnis']} anker="start" />
      <Kasten id="runner" ab={4} x={40} y={250} b={168} h={62} titel="Tool Runner" unter="führt wirklich aus" />
      <Pfeil id="p-aus" ab={4} d="M210 268 C 236 268, 240 222, 256 220" />
      <Pfeil id="p-zurueck" ab={5} d="M262 240 C 248 266, 246 296, 214 298" />
      <Kasten id="t1" ab={5} x={256} y={112} b={96} h={52} titel="read_file" />
      <Kasten id="t2" ab={5} x={256} y={192} b={96} h={52} titel="send_email" />
      <Kasten id="t3" ab={5} x={256} y={272} b={96} h={52} titel="search" />
      <Notiz id="tools" ab={5} x={304} y={96} zeilen={['Tools']} anker="middle" art="stark" />
      <Notiz id="kernsatz" ab={6} x={124} y={350} zeilen={['Das Modell führt', 'nie etwas aus.']} anker="middle" art="akzent" versteckt />
    </>
  ),
});
