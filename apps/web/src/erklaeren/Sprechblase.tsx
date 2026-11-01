import type { ReactNode } from 'react';
import { zielperson as person, type ZielpersonId } from '@karol-learn/karten-kern';
import { KUERZEL } from './texte';

/** Die Nachfrage der Zielperson als Sprechblase. Modell-Text, nur als Text gerendert. */
export function Sprechblase({ zielperson, text, kinder }: { zielperson: ZielpersonId; text: string; kinder?: ReactNode }) {
  const z = person(zielperson);
  return (
    <figure className="erkl-blase" data-testid="nachfrage">
      <figcaption className="erkl-blase__wer">
        <span className="erkl-avatar erkl-avatar--klein" aria-hidden>{KUERZEL[zielperson]}</span>
        <span>{z.titel} fragt nach</span>
      </figcaption>
      <blockquote className="erkl-blase__text"><p>{text}</p></blockquote>
      {kinder}
    </figure>
  );
}
