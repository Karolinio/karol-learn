/**
 * Positivliste der Repo-Struktur (siehe docs/STRUKTUR.md). Pur: bekommt die Liste der
 * versionierten Dateien (relativ, mit `/`) und gibt Fehlertexte zurück.
 */

export const WURZEL_DATEIEN: readonly string[] = [
  '.env.example', '.gitignore', 'AGENTS.md', 'README.md',
  'package.json', 'package-lock.json', 'tsconfig.base.json', 'tsconfig.json', 'vercel.json', 'vitest.config.ts',
];
export const WURZEL_ORDNER: readonly string[] = ['.githooks', 'agents', 'apps', 'docs', 'inhalt', 'packages', 'scripts'];

export const AGENT_PFLICHT: readonly string[] = ['agent.json', 'prompt.md', 'README.md'];
export const APP_PFLICHT: readonly string[] = ['package.json'];
export const PAKET_PFLICHT: readonly string[] = ['package.json', 'src/index.ts'];

const TRACKS = ['aie', 'fde'];
const NAME = /^[a-z0-9][a-z0-9-]*$/;
const INHALT_ORDNER = ['bilder', 'karten', 'labor', 'meldungen', 'roadmap', 'rohbestand', 'vorschlaege'];
const INHALT_DATEIEN = ['meta.json', 'karten.json'];
const DOCS_ORDNER = ['screenshots'];
const SCRIPT_DATEI = /^[a-z0-9][a-z0-9-]*(\.test)?\.ts$/;

interface Regel { praefix: string; pruefe: (rest: string[], pfad: string) => string | undefined }

const REGELN: readonly Regel[] = [
  { praefix: 'agents', pruefe: (r) => (r.length < 2 ? 'agents/ enthält nur Ordner agents/<name>/' : NAME.test(r[0]!) ? undefined : `Agentname „${r[0]}“ nur a–z, 0–9, -`) },
  { praefix: 'apps', pruefe: (r) => (r.length < 2 ? 'apps/ enthält nur Ordner apps/<name>/' : NAME.test(r[0]!) ? undefined : `App-Name „${r[0]}“ nur a–z, 0–9, -`) },
  { praefix: 'packages', pruefe: (r) => (r.length < 2 ? 'packages/ enthält nur Ordner packages/<name>/' : NAME.test(r[0]!) ? undefined : `Paketname „${r[0]}“ nur a–z, 0–9, -`) },
  { praefix: 'scripts', pruefe: (r) => (r.length === 1 && SCRIPT_DATEI.test(r[0]!) ? undefined : 'scripts/ enthält nur flache Dateien <name>.ts bzw. <name>.test.ts') },
  { praefix: '.githooks', pruefe: (r) => (r.length === 1 && NAME.test(r[0]!) ? undefined : '.githooks/ enthält nur Hook-Dateien wie pre-commit') },
  { praefix: 'docs', pruefe: pruefeDocs },
  { praefix: 'inhalt', pruefe: pruefeInhalt },
];

function pruefeDocs(r: string[]): string | undefined {
  if (r.length === 1) return /^[A-Za-z0-9-]+\.md$/.test(r[0]!) ? undefined : 'docs/ enthält nur .md-Dateien und docs/screenshots/';
  if (!DOCS_ORDNER.includes(r[0]!)) return `docs/${r[0]}/ ist nicht vorgesehen (erlaubt: ${DOCS_ORDNER.join(', ')})`;
  return r[0] === 'screenshots' && !(r.length === 2 && /^[a-z0-9-]+\.png$/.test(r[1]!)) ? 'docs/screenshots/ enthält nur <name>.png' : undefined;
}

function pruefeInhalt(r: string[]): string | undefined {
  const [kopf, ...rest] = r;
  if (r.length === 1) return INHALT_DATEIEN.includes(kopf!) ? undefined : `inhalt/${kopf} gehört in einen Unterordner`;
  if (!INHALT_ORDNER.includes(kopf!)) return `inhalt/${kopf}/ ist nicht vorgesehen (erlaubt: ${INHALT_ORDNER.join(', ')})`;
  const datei = rest[rest.length - 1]!;
  if (kopf === 'karten') {
    if (rest.length !== 2 || !TRACKS.includes(rest[0]!)) return 'inhalt/karten/ enthält nur aie/ und fde/ mit <thema>.json';
    return /^[a-z0-9-]+\.json$/.test(datei) ? undefined : `inhalt/karten/${rest[0]}/${datei}: nur <slug>.json`;
  }
  if (kopf === 'roadmap') return rest.length === 1 && TRACKS.some((t) => datei === `${t}.json`) ? undefined : 'inhalt/roadmap/ enthält nur aie.json und fde.json';
  if (kopf === 'bilder') {
    if (rest.length === 1) return /^[a-z0-9-]+\.json$/.test(datei) ? undefined : 'inhalt/bilder/ enthält nur JSON-Listen und themen/';
    return rest.length === 2 && rest[0] === 'themen' && /^(aie|fde)-[a-z0-9-]+\.webp$/.test(datei) ? undefined : 'inhalt/bilder/themen/ enthält nur <track>-<slug>.webp';
  }
  return rest.length === 1 && /^([a-z0-9][a-z0-9-]*\.jsonl?|\.gitkeep)$/.test(datei) ? undefined : `inhalt/${kopf}/ enthält nur flache JSON-Dateien`;
}

/** Prüft die Liste der versionierten Dateien gegen die Positivliste. */
export function pruefeStruktur(dateien: readonly string[]): string[] {
  const fehler = new Set<string>();
  const ordnerMit = new Map<string, Set<string>>();
  for (const pfad of dateien) {
    const teile = pfad.split('/');
    const [kopf, ...rest] = teile;
    if (!kopf) continue;
    if (rest.length === 0) {
      if (!WURZEL_DATEIEN.includes(kopf)) fehler.add(`${kopf}: lose Datei in der Wurzel (erlaubt: ${WURZEL_DATEIEN.join(', ')})`);
      continue;
    }
    if (!WURZEL_ORDNER.includes(kopf)) { fehler.add(`${kopf}/: Ordner in der Wurzel nicht vorgesehen (erlaubt: ${WURZEL_ORDNER.join(', ')})`); continue; }
    const regel = REGELN.find((x) => x.praefix === kopf);
    const meldung = regel?.pruefe(rest, pfad);
    if (meldung) fehler.add(`${pfad}: ${meldung}`);
    if (['agents', 'apps', 'packages'].includes(kopf) && rest.length >= 2) {
      const ordner = `${kopf}/${rest[0]}`;
      ordnerMit.set(ordner, new Set([...(ordnerMit.get(ordner) ?? []), rest.slice(1).join('/')]));
    }
  }
  for (const [ordner, inhalt] of ordnerMit) {
    const pflicht = ordner.startsWith('agents/') ? AGENT_PFLICHT : ordner.startsWith('apps/') ? APP_PFLICHT : PAKET_PFLICHT;
    const fehlt = pflicht.filter((p) => !inhalt.has(p));
    if (fehlt.length) fehler.add(`${ordner}/: es fehlt ${fehlt.join(', ')}`);
  }
  return [...fehler].sort();
}
