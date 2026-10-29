import { TRACKS, type Track } from '@karol-learn/karten-kern';

export const TRACK_NAME: Record<Track, string> = { aie: 'AI Engineer', fde: 'Forward Deployed Engineer' };
export const TRACK_KURZ: Record<Track, string> = { aie: 'AI Engineer', fde: 'Forward Deployed' };
/** Für schmale Segmente (unter 420 px): gleich lang, damit nichts abgeschnitten wird. */
export const TRACK_SCHMAL: Record<Track, string> = { aie: 'AI Engineer', fde: 'FD Engineer' };

export function TrackSegment({ wert, onWahl }: { wert: Track; onWahl: (t: Track) => void }) {
  const index = TRACKS.indexOf(wert);
  return (
    <div className="segment" role="radiogroup" aria-label="Track wählen">
      <span className="segment__daumen" style={{ transform: `translateX(${index * 100}%)` }} aria-hidden />
      {TRACKS.map((t) => (
        <button key={t} type="button" role="radio" aria-checked={t === wert} data-track={t} aria-label={TRACK_NAME[t]}
          className={`segment__knopf${t === wert ? ' ist-aktiv' : ''}`} onClick={() => onWahl(t)}>
          <span className="segment__punkt" aria-hidden />
          <span className="segment__lang" aria-hidden>{TRACK_KURZ[t]}</span>
          <span className="segment__schmal" aria-hidden>{TRACK_SCHMAL[t]}</span>
        </button>
      ))}
    </div>
  );
}
