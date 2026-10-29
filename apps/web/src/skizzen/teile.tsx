import { createContext, useContext, type KeyboardEvent, type ReactNode } from 'react';
import { handRechteck, saatAus } from './hand';

/** Was jedes Teil der Skizze wissen muss: welcher Schritt, was hervorgehoben ist, wohin ein Tipp springt. */
export interface SkizzenLage { index: number; fokus: ReadonlySet<string>; springe: (n: number) => void; marke: string }

export const SkizzenKontext = createContext<SkizzenLage>({ index: 0, fokus: new Set(), springe: () => {}, marke: 'sk' });

function zustand(lage: SkizzenLage, id: string, ab: number, versteckt = false): string {
  if (lage.index < ab) return versteckt ? ' ist-weg' : ' ist-geist';
  return lage.fokus.has(id) ? ' ist-fokus' : '';
}

function tippbar(lage: SkizzenLage, ab: number, name: string) {
  return {
    role: 'button' as const, tabIndex: 0, 'aria-label': name,
    onClick: () => lage.springe(ab),
    onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lage.springe(ab); } },
  };
}

export type KastenArt = 'knoten' | 'rahmen' | 'leise' | 'ok' | 'nein';

/** Ein Kasten mit Titel und optionaler Unterzeile. `rahmen` = Umgebung mit Titel oben links. */
export function Kasten({ id, ab = 0, x, y, b, h, titel, unter, art = 'knoten', r = 14, links }: {
  id: string; ab?: number; x: number; y: number; b: number; h: number; titel: string; unter?: string; art?: KastenArt; r?: number; links?: boolean;
}) {
  const lage = useContext(SkizzenKontext);
  const rahmen = art === 'rahmen';
  const tx = links ? x + 14 : x + b / 2;
  return (
    <g className={`sk-kasten sk-kasten--${art}${zustand(lage, id, ab)}`} {...tippbar(lage, ab, unter ? `${titel}: ${unter}` : titel)}>
      <path d={handRechteck(x, y, b, h, r, saatAus(id))} />
      {rahmen ? (
        <text x={x + 14} y={y + 22} className="sk-rahmentitel">{titel}</text>
      ) : (
        <>
          <text x={tx} y={y + h / 2 + (unter ? -3 : 5)} className="sk-titel" textAnchor={links ? 'start' : 'middle'}>{titel}</text>
          {unter ? <text x={tx} y={y + h / 2 + 14} className="sk-unter" textAnchor={links ? 'start' : 'middle'}>{unter}</text> : null}
        </>
      )}
    </g>
  );
}

/** Pfeil entlang eines Pfads; hervorgehoben, wenn seine id im Fokus ist. */
export function Pfeil({ id, ab = 0, d, gestrichelt, ohneSpitze }: { id: string; ab?: number; d: string; gestrichelt?: boolean; ohneSpitze?: boolean }) {
  const lage = useContext(SkizzenKontext);
  const heiss = lage.index >= ab && lage.fokus.has(id);
  return (
    <path d={d} className={`sk-pfeil${gestrichelt ? ' sk-pfeil--gestrichelt' : ''}${zustand(lage, id, ab)}`}
      markerEnd={ohneSpitze ? undefined : `url(#${lage.marke}-${heiss ? 'heiss' : 'kalt'})`} />
  );
}

/** Freier Text, mehrzeilig über `zeilen`. */
export function Notiz({ id, ab = 0, x, y, zeilen, anker = 'start', art = 'leise', versteckt }: {
  id?: string; ab?: number; x: number; y: number; zeilen: readonly string[]; anker?: 'start' | 'middle' | 'end';
  art?: 'leise' | 'stark' | 'akzent' | 'code' | 'nein'; versteckt?: boolean;
}) {
  const lage = useContext(SkizzenKontext);
  return (
    <text x={x} y={y} textAnchor={anker} className={`sk-notiz sk-notiz--${art}${zustand(lage, id ?? '', ab, versteckt)}`}>
      {zeilen.map((z, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : '1.3em'}>{z}</tspan>)}
    </text>
  );
}

/** Gruppe, die als Ganzes erscheint und hervorgehoben wird (z. B. ein Balkenstück). */
export function Teil({ id, ab = 0, name, versteckt, kinder }: { id: string; ab?: number; name?: string; versteckt?: boolean; kinder: ReactNode }) {
  const lage = useContext(SkizzenKontext);
  const extra = name ? tippbar(lage, ab, name) : {};
  return <g className={`sk-teil${zustand(lage, id, ab, versteckt)}`} {...extra}>{kinder}</g>;
}

/** Pfeilspitzen; die id kommt aus dem Kontext, damit zwei Skizzen sich nicht stören. */
export function Spitzen() {
  const { marke } = useContext(SkizzenKontext);
  return (
    <defs>
      {(['kalt', 'heiss'] as const).map((art) => (
        <marker key={art} id={`${marke}-${art}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M1 1 9 5 1 9" className={`sk-spitze sk-spitze--${art}`} />
        </marker>
      ))}
    </defs>
  );
}
