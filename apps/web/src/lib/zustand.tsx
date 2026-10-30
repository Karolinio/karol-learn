import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';
import { bewerte, laborErgebnisSchema, merkeLaborErgebnis, type LaborErgebnis, type Lernstand, type Session, type Track } from '@karol-learn/karten-kern';
import { heute } from './datum';
import { ladeInhalt, type Inhalt } from './inhalt';
import { serverDa, meldeAnServer } from './server';
import { baueExport, bitteUmDauer, einstellungenSchema, oeffneSpeicher, type Einstellungen, type Speicher, type SpeicherExport } from './speicher';

type Staende = Readonly<Record<string, Lernstand>>;
interface Meldung { id: string; grund: string; zeit: string }

export interface AppZustand {
  laden: 'laedt' | 'fehler' | 'bereit';
  fehler?: string;
  inhalt?: Inhalt;
  staende: Staende;
  sessions: readonly Session[];
  /** Gelöste Störfälle, höchstens einer je Szenario. */
  labor: readonly LaborErgebnis[];
  einstellungen: Einstellungen;
  speicherArt?: Speicher['art'];
  server: boolean;
  bewerteKarte: (id: string, gewusst: boolean) => void;
  speichereSession: (s: Session) => void;
  speichereLaborErgebnis: (e: LaborErgebnis) => void;
  setzeTrack: (t: Track) => void;
  setzeNeue: (n: Einstellungen['neueProSession']) => void;
  melde: (id: string, grund: string) => Promise<'server' | 'lokal'>;
  exportiere: () => SpeicherExport;
  importiere: (d: SpeicherExport) => void;
  setzeZurueck: () => void;
  pruefeServer: () => Promise<void>;
}

const Kontext = createContext<AppZustand | null>(null);
const MAX_SESSIONS = 365;
const STANDARD: Einstellungen = einstellungenSchema.parse({});
const laborListe = z.array(laborErgebnisSchema).catch([]);

export function AppProvider({ children }: { children: ReactNode }) {
  const [inhalt, setInhalt] = useState<Inhalt>();
  const [laden, setLaden] = useState<AppZustand['laden']>('laedt');
  const [fehler, setFehler] = useState<string>();
  const [staende, setStaende] = useState<Staende>({});
  const [sessions, setSessions] = useState<readonly Session[]>([]);
  const [labor, setLabor] = useState<readonly LaborErgebnis[]>([]);
  const [einstellungen, setEinstellungen] = useState<Einstellungen>(STANDARD);
  const [server, setServer] = useState(false);
  const [speicherArt, setSpeicherArt] = useState<Speicher['art']>();
  const speicher = useRef<Speicher>();

  const schreibe = useCallback((schluessel: string, wert: unknown) => {
    speicher.current?.schreibe(schluessel, wert).catch(() => setSpeicherArt('ram'));
  }, []);

  useEffect(() => {
    let aktiv = true;
    (async () => {
      try {
        const sp = await oeffneSpeicher();
        speicher.current = sp;
        const [i, st, se, ei, la] = await Promise.all([
          ladeInhalt(),
          sp.lies<Staende>('lernstand'),
          sp.lies<Session[]>('sessions'),
          sp.lies<unknown>('einstellungen'),
          sp.lies<unknown>('labor'),
        ]);
        if (!aktiv) return;
        setInhalt(i);
        setStaende(st ?? {});
        setSessions(se ?? []);
        setLabor(laborListe.parse(la ?? []));
        setEinstellungen(einstellungenSchema.catch(STANDARD).parse(ei ?? {}));
        setSpeicherArt(sp.art);
        setLaden('bereit');
        void bitteUmDauer();
      } catch (e) {
        if (!aktiv) return;
        setFehler((e as Error).message);
        setLaden('fehler');
      }
    })();
    void serverDa().then((da) => aktiv && setServer(da));
    return () => { aktiv = false; };
  }, []);

  const bewerteKarte = useCallback((id: string, gewusst: boolean) => {
    setStaende((alt) => {
      const neu = { ...alt, [id]: bewerte(alt[id], gewusst, heute(), id) };
      schreibe('lernstand', neu);
      return neu;
    });
  }, [schreibe]);

  const speichereSession = useCallback((s: Session) => {
    setSessions((alt) => {
      const neu = [...alt.filter((x) => x.id !== s.id), s].slice(-MAX_SESSIONS);
      schreibe('sessions', neu);
      return neu;
    });
  }, [schreibe]);

  const speichereLaborErgebnis = useCallback((e: LaborErgebnis) => {
    setLabor((alt) => {
      const neu = merkeLaborErgebnis(alt, e);
      schreibe('labor', neu);
      return neu;
    });
  }, [schreibe]);

  const setzeTrack = useCallback((track: Track) => {
    setEinstellungen((alt) => { const neu = { ...alt, track }; schreibe('einstellungen', neu); return neu; });
  }, [schreibe]);

  const setzeNeue = useCallback((neueProSession: Einstellungen['neueProSession']) => {
    setEinstellungen((alt) => { const neu = { ...alt, neueProSession }; schreibe('einstellungen', neu); return neu; });
  }, [schreibe]);

  const melde = useCallback(async (id: string, grund: string) => {
    if (server) {
      try { await meldeAnServer(id, grund); return 'server' as const; } catch { /* lokal weiter */ }
    }
    const alt = (await speicher.current?.lies<Meldung[]>('meldungen')) ?? [];
    schreibe('meldungen', [...alt, { id, grund, zeit: new Date().toISOString() }]);
    setStaende((s) => (s[id] ? { ...s, [id]: { ...s[id]!, gemeldet: true } } : s));
    return 'lokal' as const;
  }, [server, schreibe]);

  const exportiere = useCallback(() => {
    const ei = { ...einstellungen, exportErinnert: heute() };
    setEinstellungen(ei);
    schreibe('einstellungen', ei);
    return baueExport({ lernstand: { ...staende }, sessions: [...sessions], einstellungen: ei, labor: [...labor] });
  }, [einstellungen, labor, schreibe, sessions, staende]);

  const importiere = useCallback((d: SpeicherExport) => {
    setStaende(d.lernstand); setSessions(d.sessions); setEinstellungen(d.einstellungen); setLabor(d.labor);
    schreibe('lernstand', d.lernstand); schreibe('sessions', d.sessions); schreibe('einstellungen', d.einstellungen); schreibe('labor', d.labor);
  }, [schreibe]);

  const setzeZurueck = useCallback(() => {
    setStaende({}); setSessions([]); setLabor([]);
    schreibe('lernstand', {}); schreibe('sessions', []); schreibe('labor', []);
  }, [schreibe]);

  const pruefeServer = useCallback(async () => setServer(await serverDa()), []);

  const wert = useMemo<AppZustand>(() => ({
    laden, fehler, inhalt, staende, sessions, labor, einstellungen, speicherArt, server,
    bewerteKarte, speichereSession, speichereLaborErgebnis, setzeTrack, setzeNeue, melde, exportiere, importiere, setzeZurueck, pruefeServer,
  }), [laden, fehler, inhalt, staende, sessions, labor, einstellungen, speicherArt, server,
    bewerteKarte, speichereSession, speichereLaborErgebnis, setzeTrack, setzeNeue, melde, exportiere, importiere, setzeZurueck, pruefeServer]);

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useApp(): AppZustand {
  const z = useContext(Kontext);
  if (!z) throw new Error('useApp außerhalb von AppProvider');
  return z;
}

/** Nur für Bildschirme, die geladenen Inhalt brauchen. */
export function useInhalt(): Inhalt {
  const { inhalt } = useApp();
  if (!inhalt) throw new Error('Inhalt noch nicht geladen');
  return inhalt;
}
