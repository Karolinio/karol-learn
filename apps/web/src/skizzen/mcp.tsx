import { macheSkizze } from './mache';
import { Kasten, Notiz, Pfeil } from './teile';

export const mcp = macheSkizze({
  id: 'mcp',
  titel: 'MCP: der Stecker',
  track: 'aie',
  themen: ['MCP', 'Schnittstellen'],
  kurztext: 'Host, Client, Server, Dienst. Und warum MCP nicht die API ist.',
  viewBox: '0 0 360 420',
  schritte: [
    { titel: 'Host', text: 'Die App mit dem Modell, z. B. Claude Code. Sie entscheidet, welche MCP-Server sie anbindet.', karte: 'aie-mcp-rollen', fokus: ['host'] },
    { titel: 'Client', text: 'Im Host steckt je Server ein Client. Jeder hält genau eine Verbindung.', karte: 'aie-s-mcp-ein-client-pro-server', fokus: ['client', 'p-mc'] },
    { titel: 'Server', text: 'Der MCP-Server bietet Tools, Resources und Prompts an, immer im gleichen Format (JSON-RPC).', karte: 'aie-s-mcp-tools', fokus: ['server', 'p-cs', 'n-cs'] },
    { titel: 'Dienst und API', text: 'Hinter dem Server liegt der eigentliche Dienst mit seiner API, z. B. Gmail. Der Server übersetzt dorthin.', karte: 'aie-api', fokus: ['dienst', 'p-sd', 'n-sd'] },
    { titel: 'API = direkte Schnittstelle', text: 'Eine API ist die direkte Schnittstelle eines Dienstes. Jeder Dienst hat seine eigene, also eigener Code pro Dienst.', karte: 'aie-mcp-vs-api', fokus: ['p-direkt', 'n-direkt', 'dienst'] },
    { titel: 'MCP = Standard-Stecker davor', text: 'MCP ist der genormte Stecker vor der API. Der Host lernt ihn einmal und kann dann jeden Server nutzen.', karte: 'aie-mcp', fokus: ['client', 'server', 'p-cs', 'n-cs'] },
  ],
  zeichnung: () => (
    <>
      <Kasten id="host" x={8} y={8} b={344} h={136} titel="Host: z. B. Claude Code" art="rahmen" r={22} />
      <Kasten id="modell" x={24} y={50} b={118} h={56} titel="Modell" />
      <Pfeil id="p-mc" ab={1} d="M146 78 L186 78" />
      <Kasten id="client" ab={1} x={190} y={50} b={146} h={56} titel="Client" unter="je Server einer" />
      <Pfeil id="p-cs" ab={2} d="M262 110 C 262 150, 240 160, 236 196" />
      <Notiz id="n-cs" ab={2} x={272} y={164} zeilen={['MCP', '(JSON-RPC)']} art="akzent" />
      <Kasten id="server" ab={2} x={120} y={200} b={160} h={60} titel="MCP-Server" unter="z. B. Gmail-MCP" />
      <Pfeil id="p-sd" ab={3} d="M200 264 L200 326" />
      <Notiz id="n-sd" ab={3} x={210} y={300} zeilen={['API-Aufruf']} />
      <Kasten id="dienst" ab={3} x={120} y={330} b={160} h={60} titel="Dienst: Gmail" unter="mit eigener Gmail API" />
      <Pfeil id="p-direkt" ab={4} d="M50 110 C 40 220, 50 330, 114 356" gestrichelt />
      <Notiz id="n-direkt" ab={4} x={20} y={406} zeilen={['ohne MCP: eigener Code je Dienst']} />
    </>
  ),
});
