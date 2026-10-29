import { Link } from 'react-router-dom';
import type { Track } from '@karol-learn/karten-kern';
import { Icon } from '../components/ui/Icon';
import { terminText } from '../lib/datum';
import { useApp } from '../lib/zustand';

export function Leer({ track }: { track: Track }) {
  const { staende, inhalt } = useApp();
  const termine = (inhalt?.karten ?? []).filter((k) => k.track === track).map((k) => staende[k.id]?.faellig).filter((f): f is string => !!f).sort();
  return (
    <main className="leer" id="inhalt" data-track={track}>
      <span className="leer__icon" aria-hidden><Icon name="haken" size={34} /></span>
      <h1>Alles erledigt</h1>
      <p>Nächster Termin: {terminText(termine[0])}.</p>
      <Link className="knopf knopf--primaer" to="/">Zu Heute</Link>
    </main>
  );
}
