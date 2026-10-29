/**
 * Handgezeichnet, aber ruhig: Rechtecke mit leicht unregelmäßigen Kanten.
 * Deterministisch (gleiche Eingabe, gleicher Strich), damit nichts flackert.
 */
const WACKEL = 0.9;

function zufall(saat: number): () => number {
  let x = Math.abs(Math.floor(saat)) % 2147483647 || 1;
  return () => { x = (x * 48271) % 2147483647; return (x / 2147483647) * 2 - 1; };
}

export function saatAus(text: string): number {
  return [...text].reduce((h, z) => (h * 31 + z.charCodeAt(0)) % 2147483647, 7);
}

const f = (n: number) => Math.round(n * 10) / 10;

/** Abgerundetes Rechteck als Pfad mit kleinen Unregelmäßigkeiten an Kanten und Ecken. */
export function handRechteck(x: number, y: number, b: number, h: number, r: number, saat: number): string {
  const z = zufall(saat);
  const w = () => z() * WACKEL;
  const rr = Math.min(r, b / 2, h / 2);
  return [
    `M ${f(x + rr + w())} ${f(y + w())}`,
    `Q ${f(x + b / 2)} ${f(y + w())} ${f(x + b - rr + w())} ${f(y + w())}`,
    `Q ${f(x + b + w())} ${f(y + w())} ${f(x + b + w())} ${f(y + rr + w())}`,
    `Q ${f(x + b + w())} ${f(y + h / 2)} ${f(x + b + w())} ${f(y + h - rr + w())}`,
    `Q ${f(x + b + w())} ${f(y + h + w())} ${f(x + b - rr + w())} ${f(y + h + w())}`,
    `Q ${f(x + b / 2)} ${f(y + h + w())} ${f(x + rr + w())} ${f(y + h + w())}`,
    `Q ${f(x + w())} ${f(y + h + w())} ${f(x + w())} ${f(y + h - rr + w())}`,
    `Q ${f(x + w())} ${f(y + h / 2)} ${f(x + w())} ${f(y + rr + w())}`,
    `Q ${f(x + w())} ${f(y + w())} ${f(x + rr + w())} ${f(y + w())} Z`,
  ].join(' ');
}
