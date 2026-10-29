import { execFile } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Liefert die Video-id, wenn `eingabe` ein YouTube-Link ist, sonst undefined. */
export function youtubeId(eingabe: string): string | undefined {
  let url: URL;
  try { url = new URL(eingabe); } catch { return undefined; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
  const host = url.hostname.replace(/^(www|m)\./, '');
  const id = host === 'youtu.be' ? url.pathname.slice(1)
    : host === 'youtube.com' && url.pathname === '/watch' ? url.searchParams.get('v') ?? ''
    : host === 'youtube.com' && url.pathname.startsWith('/shorts/') ? url.pathname.slice('/shorts/'.length)
    : '';
  return ID.test(id) ? id : undefined;
}

/** Macht aus WebVTT-Untertiteln Fließtext: ohne Kopf, Zeitstempel und Tags, ohne doppelte Zeilen. */
export function vttZuText(vtt: string): string {
  const zeilen: string[] = [];
  for (const roh of vtt.split(/\r?\n/)) {
    const z = roh.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
    if (!z || z === 'WEBVTT' || /^(Kind|Language|NOTE|STYLE)\b/.test(z) || z.includes('-->') || /^\d+$/.test(z)) continue;
    if (zeilen[zeilen.length - 1] !== z) zeilen.push(z);
  }
  return zeilen.join('\n');
}

export interface YoutubeTranskript { titel: string; text: string }

/** Ausschnitt aus `yt-dlp -J`: Originalsprache, manuelle und automatische Spuren je Sprachcode. */
export interface VideoInfo { title?: string; language?: string | null; subtitles?: Record<string, unknown>; automatic_captions?: Record<string, unknown> }
export interface Spur { sprache: string; auto: boolean }

/**
 * Manuelle Untertitel auf Deutsch, Englisch oder in der Originalsprache, sonst die automatische Originalspur.
 * Automatische Spuren in anderen Sprachen sind Übersetzungen; die drosselt YouTube mit 429, deshalb nie.
 */
export function waehleSpur(info: VideoInfo): Spur | undefined {
  const manuell = Object.keys(info.subtitles ?? {}).filter((k) => k !== 'live_chat');
  const passt = (basis: string) => manuell.find((k) => k === basis || k.startsWith(`${basis}-`));
  const basen = ['de', 'en', ...(info.language ? [info.language] : [])];
  const treffer = basen.map(passt).find(Boolean);
  if (treffer) return { sprache: treffer, auto: false };
  if (!info.language) return undefined;
  const auto = Object.keys(info.automatic_captions ?? {});
  const original = [`${info.language}-orig`, info.language].find((k) => auto.includes(k));
  return original ? { sprache: original, auto: true } : undefined;
}

function fuehreAus(bin: string, args: string[], timeoutMs: number): Promise<{ code: number; out: string; err: string; fehlt: boolean }> {
  return new Promise((ok) => {
    execFile(bin, args, { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 }, (e, out, err) => {
      const code = (e as NodeJS.ErrnoException | null)?.code;
      ok({ code: e ? (typeof code === 'number' ? code : 1) : 0, out: String(out), err: String(err), fehlt: code === 'ENOENT' });
    });
  });
}

const FEHLT = 'yt-dlp ist nicht installiert. Siehe agents/video-tutor/README.md, Abschnitt „yt-dlp einrichten“.';

/** Erst die Spurenliste lesen, dann genau eine Spur holen. Node (läuft ohnehin) dient yt-dlp als JS-Laufzeit. */
export async function holeYoutubeTranskript(id: string, bin: string, timeoutMs: number): Promise<YoutubeTranskript> {
  const url = `https://www.youtube.com/watch?v=${id}`;
  const basis = ['--js-runtimes', `node:${process.execPath}`, '--no-playlist', '--skip-download'];
  const liste = await fuehreAus(bin, [...basis, '-J', url], timeoutMs);
  if (liste.fehlt) throw new Error(FEHLT);
  if (liste.code !== 0) throw new Error(`yt-dlp endete mit Code ${liste.code}: ${liste.err.slice(0, 300)}`);
  const info = JSON.parse(liste.out) as VideoInfo;
  const spur = waehleSpur(info);
  if (!spur) throw new Error('Das Video hat keine Untertitel in der Originalsprache, auch keine automatischen.');

  const ordner = mkdtempSync(join(tmpdir(), 'kl-yt-'));
  try {
    const r = await fuehreAus(bin, [
      ...basis, spur.auto ? '--write-auto-subs' : '--write-subs',
      '--sub-langs', spur.sprache, '--sub-format', 'vtt',
      '-o', join(ordner, '%(id)s.%(ext)s'), url,
    ], timeoutMs);
    if (r.code !== 0) throw new Error(`yt-dlp endete mit Code ${r.code}: ${r.err.slice(0, 300)}`);
    const wahl = readdirSync(ordner).find((f) => f.endsWith('.vtt'));
    if (!wahl) throw new Error(`Die Untertitel (${spur.sprache}) ließen sich nicht laden.`);
    const text = vttZuText(readFileSync(join(ordner, wahl), 'utf8'));
    if (!text.trim()) throw new Error('Die Untertitel sind leer.');
    return { titel: info.title || id, text };
  } finally {
    rmSync(ordner, { recursive: true, force: true });
  }
}
