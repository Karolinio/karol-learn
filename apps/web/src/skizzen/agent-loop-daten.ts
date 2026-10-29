export type KnotenId = 'runtime' | 'harness' | 'kontext' | 'modell' | 'fertig' | 'gateway' | 'tool' | 'ergebnis' | 'schleife';

export interface Schritt { knoten: KnotenId; titel: string; text: string; karte: string; nurMitGateway?: boolean }

export const SCHRITTE: readonly Schritt[] = [
  { knoten: 'runtime', titel: 'Runtime', text: 'Der laufende Prozess auf einem Rechner. Hier lebt der Agent, mit Grenzen für Zeit, Speicher und Rechte.', karte: 'aie-runtime' },
  { knoten: 'harness', titel: 'Harness', text: 'Der Code um das Modell. Er baut den Kontext, bietet Tools an und steuert die Schleife.', karte: 'aie-harness' },
  { knoten: 'kontext', titel: 'Kontext bauen', text: 'Nachrichtenliste plus Tool-Beschreibungen. Nur das sieht das Modell.', karte: 'aie-kontext' },
  { knoten: 'modell', titel: 'Modell antwortet', text: 'Das Modell erzeugt den nächsten Text: entweder eine Antwort oder eine Tool-Bitte.', karte: 'aie-modell' },
  { knoten: 'fertig', titel: 'Text heißt fertig', text: 'Kommt nur Text zurück, endet die Schleife. Ein Limit kann sie auch beenden.', karte: 'aie-stop' },
  { knoten: 'gateway', titel: 'Gateway prüft', text: 'Zwischen Tool-Bitte und Ausführung: ohne gültiges Mandat passiert nichts.', karte: 'aie-s-sec-wiya-gateway', nurMitGateway: true },
  { knoten: 'tool', titel: 'Tool läuft', text: 'Der Harness führt das Tool aus, nicht das Modell. Das Modell hat keine Hände.', karte: 'aie-tool' },
  { knoten: 'ergebnis', titel: 'Ergebnis zurück', text: 'Das Ergebnis kommt mit der Aufruf-id in die Nachrichtenliste.', karte: 'aie-ergebnis-zuordnung' },
  { knoten: 'schleife', titel: 'Von vorn', text: 'Mit dem Ergebnis ruft der Harness das Modell erneut. So lange, bis es fertig ist.', karte: 'aie-loop' },
];

export const KNOTEN: Readonly<Record<'kontext' | 'modell' | 'fertig' | 'gateway' | 'tool' | 'ergebnis', { x: number; y: number; name: string }>> = {
  modell: { x: 150, y: 54, name: 'Modell' },
  fertig: { x: 300, y: 54, name: 'Fertig' },
  kontext: { x: 92, y: 236, name: 'Kontext' },
  gateway: { x: 262, y: 236, name: 'Gateway' },
  tool: { x: 262, y: 360, name: 'Tool' },
  ergebnis: { x: 92, y: 360, name: 'Ergebnis' },
};

export interface Kante { id: string; von: keyof typeof KNOTEN; nach: keyof typeof KNOTEN; d: string; nurMitGateway?: boolean; ohneGateway?: boolean }

export const KANTEN: readonly Kante[] = [
  { id: 'k-m', von: 'kontext', nach: 'modell', d: 'M 128 208 C 128 150, 138 112, 142 84' },
  { id: 'm-f', von: 'modell', nach: 'fertig', d: 'M 198 54 L 248 54' },
  { id: 'm-g', von: 'modell', nach: 'gateway', d: 'M 172 78 C 200 110, 262 150, 262 206', nurMitGateway: true },
  { id: 'm-t', von: 'modell', nach: 'tool', d: 'M 172 78 C 236 130, 262 230, 262 330', ohneGateway: true },
  { id: 'g-t', von: 'gateway', nach: 'tool', d: 'M 262 264 L 262 328', nurMitGateway: true },
  { id: 't-e', von: 'tool', nach: 'ergebnis', d: 'M 214 360 L 144 360' },
  { id: 'e-k', von: 'ergebnis', nach: 'kontext', d: 'M 92 332 L 92 268' },
];
