import { macheSkizze } from './mache';
import { Kasten, Notiz, Pfeil } from './teile';

export const gatewayMandat = macheSkizze({
  id: 'gateway-mandat',
  titel: 'Gateway und Mandat',
  track: 'fde',
  themen: ['wiya'],
  kurztext: 'Der wiya-Fall: Eine Erstattung wird gegen ein signiertes Mandat geprüft.',
  viewBox: '0 0 360 500',
  schritte: [
    { titel: 'Die Anfrage', text: 'Ein Agent will handeln: Erstatte 180 € an den Kunden. Das ist zunächst nur eine Tool-Bitte.', karte: 'fde-wiya-gateway', fokus: ['anfrage'] },
    { titel: 'Das Mandat', text: 'Das Mandat legt fest, was dieser Agent darf, z. B. Erstattungen bis 200 €. Es ist signiert und liegt beim Gateway, nicht beim Agenten.', karte: 'fde-wiya-mandat-wo', fokus: ['mandat'] },
    { titel: 'Gateway prüft', text: 'Das Gateway prüft die Bitte gegen das Mandat. Deterministisch: gleiche Eingabe, gleiches Urteil. Kein Modell entscheidet.', karte: 'fde-deterministisch', fokus: ['gateway', 'p-ag', 'p-mg'] },
    { titel: 'ALLOW oder DENY', text: '180 € liegt im Rahmen: ALLOW. Wären es 250 €, käme DENY, und es passiert nichts.', karte: 'fde-k-wiya-gateway', fokus: ['allow', 'deny', 'p-ga', 'p-gd'] },
    { titel: 'Aktion', text: 'Erst nach ALLOW läuft die Erstattung. Der Agent hält dabei selbst keinen Schlüssel.', karte: 'fde-k-wiya-keine-keys', fokus: ['aktion', 'p-aa'] },
    { titel: 'Quittung', text: 'Jede Entscheidung bekommt eine Quittung: Modell, Agent, Organisation, verantwortliche Person, Zeit, Tools, Mandat, Entscheidung.', karte: 'fde-quittung', fokus: ['quittung', 'q-text', 'p-aq', 'p-dq'] },
  ],
  zeichnung: () => (
    <>
      <Kasten id="anfrage" x={40} y={8} b={280} h={58} titel="Anfrage des Agenten" unter="„Erstatte 180 € an den Kunden“" />
      <Pfeil id="p-ag" ab={2} d="M250 68 L250 92" />
      <Kasten id="mandat" ab={1} x={8} y={100} b={124} h={72} titel="Mandat" unter="signiert, bis 200 €" />
      <Pfeil id="p-mg" ab={2} d="M134 136 L146 136" />
      <Kasten id="gateway" ab={2} x={150} y={96} b={202} h={80} titel="Gateway" unter="prüft deterministisch" />
      <Pfeil id="p-ga" ab={3} d="M214 178 C 196 194, 120 190, 106 206" />
      <Pfeil id="p-gd" ab={3} d="M290 178 L274 206" gestrichelt />
      <Kasten id="allow" ab={3} x={40} y={210} b={132} h={52} titel="ALLOW" unter="180 € ≤ 200 €" art="ok" />
      <Kasten id="deny" ab={3} x={190} y={210} b={132} h={52} titel="DENY" unter="z. B. 250 €" art="nein" />
      <Notiz id="deny" ab={3} x={256} y={284} zeilen={['nichts passiert']} anker="middle" />
      <Pfeil id="p-aa" ab={4} d="M106 264 L106 290" />
      <Kasten id="aktion" ab={4} x={40} y={294} b={132} h={52} titel="Aktion" unter="Erstattung läuft" />
      <Pfeil id="p-aq" ab={5} d="M106 348 L106 370" />
      <Pfeil id="p-dq" ab={5} d="M256 294 C 256 330, 252 346, 252 370" gestrichelt />
      <Kasten id="quittung" ab={5} x={8} y={374} b={344} h={120} titel="Quittung" art="rahmen" r={18} />
      <Notiz id="q-text" ab={5} x={24} y={420} zeilen={['Modell · Agent · Organisation', 'Verantwortliche Person · Zeit', 'Tools · Mandat · Entscheidung']} art="stark" />
    </>
  ),
});
