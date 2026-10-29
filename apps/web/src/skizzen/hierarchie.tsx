import { macheSkizze } from './mache';
import { Kasten, Pfeil } from './teile';

export const hierarchie = macheSkizze({
  id: 'hierarchie',
  titel: 'Dienst, API, Endpoint, Tool',
  track: 'aie',
  themen: ['Tools', 'Schnittstellen'],
  kurztext: 'Vier Ebenen am Beispiel Gmail, von oben nach unten.',
  viewBox: '0 0 360 372',
  schritte: [
    { titel: 'Dienst', text: 'Ganz oben das Produkt, das etwas kann: Gmail verschickt und speichert Mails. Gmail selbst ist kein Tool.', karte: 'aie-tool-vs-dienst', fokus: ['dienst'] },
    { titel: 'API', text: 'Die Gmail API ist die Schnittstelle, über die Programme mit Gmail reden: Regeln, Schlüssel, Formate.', karte: 'aie-api', fokus: ['api', 'c1'] },
    { titel: 'Endpoint', text: 'Eine API hat viele Endpoints. Einer davon ist POST /messages/send: eine Adresse für genau eine Aktion.', karte: 'aie-dienst-api-endpoint-tool', fokus: ['endpoint', 'c2'] },
    { titel: 'Tool', text: 'Das Tool ist das, was der Agent sieht: send_email mit Name, Beschreibung und Schema. Der Harness ruft dahinter den Endpoint.', karte: 'aie-tool-schema', fokus: ['tool', 'c3'] },
  ],
  zeichnung: () => (
    <>
      <Kasten id="dienst" x={12} y={12} b={336} h={66} titel="Dienst" unter="Gmail, das Produkt" links />
      <Pfeil id="c1" ab={1} d="M30 80 L30 132 L38 132" />
      <Kasten id="api" ab={1} x={42} y={100} b={306} h={66} titel="API" unter="Gmail API, die Schnittstelle" links />
      <Pfeil id="c2" ab={2} d="M60 168 L60 220 L68 220" />
      <Kasten id="endpoint" ab={2} x={72} y={188} b={276} h={66} titel="Endpoint" unter="POST /messages/send" links />
      <Pfeil id="c3" ab={3} d="M90 256 L90 308 L98 308" />
      <Kasten id="tool" ab={3} x={102} y={276} b={246} h={66} titel="Tool" unter="send_email(to, subject, body)" links />
    </>
  ),
});
