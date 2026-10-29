import { useState, type ChangeEvent } from 'react';
import { NEUE_OPTIONEN } from '@karol-learn/karten-kern';
import { Button } from '../components/ui/Button';
import { Seite } from '../components/ui/Seite';
import { Sheet } from '../components/ui/Sheet';
import { SERVER } from '../lib/server';
import { pruefeImport } from '../lib/speicher';
import { useApp } from '../lib/zustand';

const SPEICHER_NAME = { idb: 'IndexedDB (dauerhaft)', local: 'localStorage (Ersatz)', ram: 'Nur Arbeitsspeicher: geht beim Schließen verloren' } as const;

export function Einstellungen() {
  const { exportiere, importiere, setzeZurueck, speicherArt, server, pruefeServer, inhalt, einstellungen, setzeNeue } = useApp();
  const [meldung, setMeldung] = useState('');
  const [fragen, setFragen] = useState(false);

  const laden = () => {
    const blob = new Blob([JSON.stringify(exportiere(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `karol-learn-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMeldung('Export gespeichert.');
  };
  const einlesen = async (e: ChangeEvent<HTMLInputElement>) => {
    const datei = e.target.files?.[0];
    e.target.value = '';
    if (!datei) return;
    const r = pruefeImport(await datei.text());
    if (r.ok) { importiere(r.daten); setMeldung(`Import fertig: ${Object.keys(r.daten.lernstand).length} Lernstände.`); }
    else setMeldung(r.fehler);
  };

  return (
    <Seite titel="Einstellungen" zurueck="/mehr" kinder={
      <div className="stapelung">
        <section aria-labelledby="e-lernen">
          <h2 id="e-lernen" className="abschnitt">Lernen</h2>
          <div className="karte einstellzeile">
            <span id="e-neue" className="einstellzeile__text">Neue Karten pro Session<small>Fällige Wiederholungen kommen dazu.</small></span>
            <div className="segment segment--drei" role="radiogroup" aria-labelledby="e-neue">
              <span className="segment__daumen" style={{ transform: `translateX(${NEUE_OPTIONEN.indexOf(einstellungen.neueProSession) * 100}%)` }} aria-hidden />
              {NEUE_OPTIONEN.map((n) => (
                <button key={n} type="button" role="radio" aria-checked={einstellungen.neueProSession === n}
                  className={`segment__knopf${einstellungen.neueProSession === n ? ' ist-aktiv' : ''}`} onClick={() => setzeNeue(n)}>{n}</button>
              ))}
            </div>
          </div>
        </section>
        <section aria-labelledby="e-daten">
          <h2 id="e-daten" className="abschnitt">Deine Daten</h2>
          <div className="karte knopfgruppe">
            <Button variante="tint" icon="teilen" onClick={laden}>Lernstand exportieren</Button>
            <label className="knopf knopf--tint">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 14.5v-11M8 10.5l4 4 4-4M5.5 14v6h13v-6" /></svg>
              <span>Lernstand importieren</span>
              <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void einlesen(e)} />
            </label>
            <Button variante="gefahr" onClick={() => setFragen(true)}>Lernstand zurücksetzen</Button>
          </div>
          <p className="fussnote" role="status">{meldung}</p>
        </section>
        <section aria-labelledby="e-system">
          <h2 id="e-system" className="abschnitt">System</h2>
          <dl className="karte infoliste">
            <div><dt>Speicher</dt><dd className={speicherArt === 'ram' ? 'ist-warnung' : ''}>{speicherArt ? SPEICHER_NAME[speicherArt] : '…'}</dd></div>
            <div><dt>Server</dt><dd>{server ? `verbunden (${SERVER})` : 'nicht da, die App läuft statisch'}</dd></div>
            <div><dt>Karten</dt><dd>{inhalt?.karten.length ?? 0}</dd></div>
            <div><dt>Inhalt vom</dt><dd>{inhalt ? new Date(inhalt.stand).toLocaleDateString('de-DE') : '…'}</dd></div>
          </dl>
          <Button variante="flach" onClick={() => void pruefeServer()}>Server erneut suchen</Button>
        </section>
        <section aria-labelledby="e-ueber">
          <h2 id="e-ueber" className="abschnitt">Über</h2>
          <dl className="karte infoliste">
            <div><dt>Illustrationen</dt><dd>KI-generiert (Higgsfield)</dd></div>
            <div><dt>Lernpfade</dt><dd>eigene Texte, Links zu roadmap.sh</dd></div>
          </dl>
        </section>
        <Sheet offen={fragen} onZu={() => setFragen(false)} titel="Wirklich zurücksetzen?" kinder={
          <div className="knopfgruppe">
            <p>Alle Lernstände und Sessions werden gelöscht. Exportiere vorher, wenn du sie behalten willst.</p>
            <Button gross variante="gefahr" onClick={() => { setzeZurueck(); setFragen(false); setMeldung('Zurückgesetzt.'); }}>Zurücksetzen</Button>
            <Button gross variante="tint" onClick={() => setFragen(false)}>Abbrechen</Button>
          </div>
        } />
      </div>
    } />
  );
}
