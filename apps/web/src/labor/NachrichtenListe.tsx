import { useState } from 'react';
import { tausender, type Nachricht } from '@karol-learn/karten-kern';
import { Icon } from '../components/ui/Icon';

/** So viele Runden stehen offen da; ältere klappen zu einer Zeile zusammen. */
const SICHTBARE_RUNDEN = 3;

function rundeVon(n: Nachricht): number {
  const m = /^r(\d+)-/.exec(n.id);
  return m ? Number(m[1]) : 0;
}

/** Text aus Tool-Ergebnissen ist fremder Inhalt: nur als Text, nie als HTML. */
function Blase({ n }: { n: Nachricht }) {
  const menge = <span className="blase__tokens">{tausender(n.tokens)} Tokens</span>;
  if (n.rolle === 'system') {
    const kompakt = n.id.startsWith('kompakt-');
    return (
      <li className={`blase blase--system${kompakt ? ' blase--kompakt' : ''}`}>
        <span className="blase__marke">{kompakt ? 'Verlauf zusammengefasst' : 'System-Prompt'} · {menge}</span>
        <p>{n.text}</p>
      </li>
    );
  }
  if (n.rolle === 'user') return <li className="blase blase--user"><p>{n.text}</p></li>;
  if (n.rolle === 'assistant') return <li className="blase blase--modell"><p>{n.text}</p></li>;
  if (n.rolle === 'tool_use') {
    return (
      <li className="blase blase--bitte">
        <span className="blase__marke"><Icon name="funke" size={14} /> Tool-Bitte · {n.aufrufId}</span>
        <code className="blase__code">{n.text}</code>
      </li>
    );
  }
  const art = n.istFehler ? ' blase--fehler' : n.istInjektion ? ' blase--injektion' : '';
  return (
    <li className={`blase blase--ergebnis${art}`}>
      <span className="blase__marke">
        <Icon name={n.istFehler ? 'kreuz' : 'eingang'} size={14} /> Tool-Ergebnis · {n.tool} · {menge}
      </span>
      {n.istInjektion ? <span className="blase__warnung">Enthält eine eingeschleuste Anweisung</span> : null}
      <p className="blase__code">{n.text}</p>
    </li>
  );
}

/** Verlauf als Chat: Nutzer rechts, Modell links, Tool-Bitten und -Ergebnisse als eigene Karten. */
export function NachrichtenListe({ nachrichten }: { nachrichten: readonly Nachricht[] }) {
  const [alle, setAlle] = useState(false);
  const letzte = Math.max(0, ...nachrichten.map(rundeVon));
  const ab = letzte - SICHTBARE_RUNDEN + 1;
  const versteckt = alle ? [] : nachrichten.filter((n) => rundeVon(n) > 0 && rundeVon(n) < ab);
  const sichtbar = nachrichten.filter((n) => !versteckt.includes(n));
  const versteckteRunden = new Set(versteckt.map(rundeVon)).size;
  const kopf = sichtbar.filter((n) => rundeVon(n) === 0);
  const rest = sichtbar.filter((n) => rundeVon(n) > 0);
  const runden = [...new Set(rest.map(rundeVon))];

  return (
    <ol className="verlauf" aria-label="Nachrichtenverlauf">
      {kopf.map((n) => <Blase key={n.id} n={n} />)}
      {versteckt.length ? (
        <li className="verlauf__mehr">
          <button type="button" className="knopf knopf--flach" onClick={() => setAlle(true)}>
            {versteckteRunden} frühere {versteckteRunden === 1 ? 'Runde' : 'Runden'} zeigen
          </button>
        </li>
      ) : null}
      {runden.map((r) => (
        <li key={r} className="verlauf__runde">
          <p className="verlauf__trenner"><span>Runde {r}</span></p>
          <ol className="verlauf__liste">{rest.filter((n) => rundeVon(n) === r).map((n) => <Blase key={n.id} n={n} />)}</ol>
        </li>
      ))}
    </ol>
  );
}
