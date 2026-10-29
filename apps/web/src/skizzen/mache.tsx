import { useId, useState, type ReactNode } from 'react';
import { SkizzenKontext, Spitzen } from './teile';
import { SkizzenRahmen } from './SkizzenRahmen';
import type { Skizze, SkizzenMeta, SkizzenSchritt } from './typen';

/** Baut aus Meta, Schritten und einer Zeichnung eine durchklickbare Skizze. */
export function macheSkizze(meta: SkizzenMeta & { schritte: readonly SkizzenSchritt[]; viewBox: string; zeichnung: () => ReactNode }): Skizze {
  const { viewBox, zeichnung: Zeichnung, ...rest } = meta;
  function Komponente() {
    const [index, setIndex] = useState(0);
    const marke = `sk${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const fokus = new Set(rest.schritte[index]?.fokus ?? []);
    return (
      <SkizzenRahmen track={rest.track} label={`Skizze ${rest.titel}`} schritte={rest.schritte} index={index} onIndex={setIndex}
        bild={
          <SkizzenKontext.Provider value={{ index, fokus, springe: setIndex, marke }}>
            <svg viewBox={viewBox} className="skizze__svg sk" aria-hidden={false}>
              <Spitzen />
              <Zeichnung />
            </svg>
          </SkizzenKontext.Provider>
        } />
    );
  }
  Komponente.displayName = `Skizze_${rest.id}`;
  return { ...rest, Komponente };
}
